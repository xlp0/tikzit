/**
 * Pure TypeScript TikZ Recursive Descent Parser
 * Parses TikZ picture and styles format into JSON-serializable AST.
 * Matches grammar rules from src/data/tikzparser.y in the C++ desktop reference.
 */

import type {
  GraphAST,
  NodeData,
  EdgeData,
  PathData,
  BoundingBox,
  Point2D,
  GraphElementProperty,
  GraphElementData,
  TikzStylesCatalog,
  TikzStyle,
  ParseDiagnostic,
  SafeParseResult,
} from '../domain/types';
import { mergeData } from '../domain/types';
import { TikzLexer, type Token, type TokenType, LexerError } from './lexer';

export class ParseError extends Error {
  public line: number;
  public column: number;

  constructor(message: string, line: number, column: number) {
    super(`[Parse error at line ${line}, col ${column}]: ${message}`);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
  }
}

export function createEmptyAST(): GraphAST {
  return {
    nodes: [],
    edges: [],
    paths: [],
    data: [],
  };
}

export class TikzParser {
  private tokens: Token[];
  private pos: number = 0;
  private ast: GraphAST;
  private nodeMap: Map<string, NodeData> = new Map();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.ast = createEmptyAST();
  }

  public getPartialAST(): GraphAST {
    return this.ast;
  }

  private peek(): Token {
    if (this.pos < this.tokens.length) {
      return this.tokens[this.pos];
    }
    const last = this.tokens[this.tokens.length - 1];
    return {
      type: 'EOF',
      value: null,
      raw: '',
      loc: last ? { ...last.loc } : { line: 1, column: 1 },
    };
  }

  private advance(): Token {
    const t = this.peek();
    if (this.pos < this.tokens.length) {
      this.pos++;
    }
    return t;
  }

  private match(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private consume(type: TokenType, errMsg?: string): Token {
    const t = this.peek();
    if (t.type === type) {
      return this.advance();
    }
    throw new ParseError(
      errMsg || `Expected token '${type}', found '${t.type}' (${t.raw})`,
      t.loc.line,
      t.loc.column
    );
  }

  public parsePicture(): GraphAST {
    // 1. Optional leading tokens before \begin{tikzpicture}
    while (!this.match('BEGIN_TIKZPICTURE') && !this.match('EOF')) {
      this.advance();
    }

    if (this.match('EOF')) {
      throw new ParseError('Missing \\begin{tikzpicture}', 1, 1);
    }

    this.consume('BEGIN_TIKZPICTURE');

    // 2. Optional graph-level properties: \begin{tikzpicture}[...]
    if (this.match('BRACKETS')) {
      this.ast.data = this.advance().value as GraphElementData;
    }

    // 3. Command loop until \end{tikzpicture}
    while (!this.match('END_TIKZPICTURE') && !this.match('EOF')) {
      const token = this.peek();

      if (token.type === 'BEGIN_PGFONLAYER') {
        this.advance();
        if (this.match('BRACED_STRING')) {
          this.advance(); // consume layer name
        }
      } else if (token.type === 'END_PGFONLAYER') {
        this.advance();
      } else if (token.type === 'NODE_CMD') {
        this.parseNode();
      } else if (token.type === 'DRAW_CMD') {
        this.parseDraw();
      } else if (token.type === 'PATH_CMD') {
        this.parsePath();
      } else if (token.type === 'SEMICOLON') {
        this.advance(); // stray semicolon
      } else {
        // Unrecognized token inside tikzpicture
        throw new ParseError(
          `Unexpected token '${token.type}' (${token.raw})`,
          token.loc.line,
          token.loc.column
        );
      }
    }

    this.consume('END_TIKZPICTURE', 'Expected \\end{tikzpicture}');
    return this.ast;
  }

  private parseNode(): void {
    const cmdToken = this.consume('NODE_CMD');
    let properties: GraphElementData = [];

    // Optional properties [style=..., fill=...]
    if (this.match('BRACKETS')) {
      properties = this.advance().value as GraphElementData;
    }

    // Node name in parentheses: (nodename)
    const nameToken = this.consume('REF', 'Expected node name in parentheses (name)');
    const name = nameToken.value.name;

    // Keyword 'at'
    this.consume('AT', 'Expected "at" after node name');

    // Coordinate (x, y)
    const coordToken = this.consume('COORD', 'Expected coordinate (x, y)');
    const position: Point2D = coordToken.value;

    // Label in braces {label}
    const labelToken = this.consume('BRACED_STRING', 'Expected label in braces {...}');
    const label = labelToken.value;

    // Terminating semicolon
    this.consume('SEMICOLON', 'Expected ";" after node definition');

    const node: NodeData = {
      id: name,
      name,
      label,
      position,
      data: properties,
      line: cmdToken.loc.line,
    };

    this.ast.nodes.push(node);
    this.nodeMap.set(name, node);
  }

  private parseDraw(): void {
    const cmdToken = this.consume('DRAW_CMD');
    let drawProperties: GraphElementData = [];

    // Optional draw-level properties: \draw [props]
    if (this.match('BRACKETS')) {
      drawProperties = this.advance().value as GraphElementData;
    }

    // Source node ref: (src) or (src.anchor)
    const srcToken = this.consume('REF', 'Expected edge source node (name)');
    let currentSource = srcToken.value.name;
    let currentSourceAnchor = srcToken.value.anchor;
    const pathFirstSource = currentSource;

    const segmentEdges: EdgeData[] = [];
    let isPathCycle = false;

    // Must have at least one 'to' segment
    if (!this.match('TO')) {
      throw new ParseError(
        'Expected "to" in \\draw statement',
        this.peek().loc.line,
        this.peek().loc.column
      );
    }

    while (this.match('TO')) {
      this.consume('TO');

      // Optional per-segment properties: to [props]
      let toProperties: GraphElementData = [];
      if (this.match('BRACKETS')) {
        toProperties = this.advance().value as GraphElementData;
      }

      // Optional inline edge node: node [props] {label}
      let edgeNode: { label: string; data: GraphElementData } | undefined = undefined;
      if (this.match('NODE_KEYWORD')) {
        this.consume('NODE_KEYWORD');
        let edgeNodeProps: GraphElementData = [];
        if (this.match('BRACKETS')) {
          edgeNodeProps = this.advance().value as GraphElementData;
        }
        const edgeNodeLabelToken = this.consume(
          'BRACED_STRING',
          'Expected edge node label in braces {...}'
        );
        edgeNode = {
          label: edgeNodeLabelToken.value,
          data: edgeNodeProps,
        };
      }

      // Target specification: (), cycle, or (tgt.anchor)
      let targetId: string;
      let targetAnchor: string | undefined;

      if (this.match('EMPTY_PARENS')) {
        this.consume('EMPTY_PARENS');
        targetId = currentSource;
        targetAnchor = currentSourceAnchor;
      } else if (this.match('CYCLE')) {
        this.consume('CYCLE');
        targetId = pathFirstSource;
        targetAnchor = undefined;
        isPathCycle = true;
      } else if (this.match('REF')) {
        const tgtToken = this.consume('REF');
        targetId = tgtToken.value.name;
        targetAnchor = tgtToken.value.anchor;
      } else {
        throw new ParseError(
          `Expected target node, '()', or 'cycle' after 'to', found '${this.peek().raw}'`,
          this.peek().loc.line,
          this.peek().loc.column
        );
      }

      // Merge per-segment properties with draw-level properties
      // Per Desktop TikZiT: toProperties take precedence; keys not in toProperties are copied from drawProperties
      const mergedData = mergeData(toProperties, drawProperties);

      const edgeId = `e_${this.ast.edges.length}`;
      const edge: EdgeData = {
        id: edgeId,
        sourceId: currentSource,
        targetId,
        sourceAnchor: currentSourceAnchor,
        targetAnchor,
        data: mergedData,
        edgeNode,
        line: cmdToken.loc.line,
      };

      segmentEdges.push(edge);
      this.ast.edges.push(edge);

      // Advance source for chained edges
      currentSource = targetId;
      currentSourceAnchor = targetAnchor;
    }

    // Terminating semicolon
    this.consume('SEMICOLON', 'Expected ";" at end of \\draw statement');

    // If part of an edge chain (>1 segment) or cycle, record PathData
    if (segmentEdges.length > 1 || isPathCycle) {
      if (!this.ast.paths) {
        this.ast.paths = [];
      }
      this.ast.paths.push({
        id: `path_${this.ast.paths.length}`,
        edgeIds: segmentEdges.map((e) => e.id),
        edges: segmentEdges.map((e) => e.id),
        isCycle: isPathCycle,
      });
    }
  }

  private parsePath(): void {
    this.consume('PATH_CMD');

    // Optional path properties: [use as bounding box]
    if (this.match('BRACKETS')) {
      this.advance();
    }

    // First coordinate: (x0, y0)
    const c1 = this.consume('COORD', 'Expected first coordinate of bounding box');
    const p1: Point2D = c1.value;

    // Keyword 'rectangle'
    this.consume('RECTANGLE', 'Expected "rectangle" in bounding box path');

    // Second coordinate: (x1, y1)
    const c2 = this.consume('COORD', 'Expected second coordinate of bounding box');
    const p2: Point2D = c2.value;

    // Terminating semicolon
    this.consume('SEMICOLON', 'Expected ";" at end of \\path statement');

    this.ast.bbox = {
      min: {
        x: Math.min(p1.x, p2.x),
        y: Math.min(p1.y, p2.y),
      },
      max: {
        x: Math.max(p1.x, p2.x),
        y: Math.max(p1.y, p2.y),
      },
    };
  }

  public parseStyles(): TikzStylesCatalog {
    const catalog: TikzStylesCatalog = { styles: [] };

    while (!this.match('EOF')) {
      if (this.match('TIKZSTYLE')) {
        this.consume('TIKZSTYLE');

        const nameToken = this.consume(
          'BRACED_STRING',
          'Expected style name in braces {name}'
        );
        const name = nameToken.value;

        this.consume('EQUALS', 'Expected "=" after style name');

        const propsToken = this.consume(
          'BRACKETS',
          'Expected style properties in brackets [...]'
        );
        const properties: GraphElementData = propsToken.value;

        // Optional semicolon
        if (this.match('SEMICOLON')) {
          this.advance();
        }

        catalog.styles.push({ name, data: properties, properties });
      } else {
        // Skip any unexpected token at style top level
        this.advance();
      }
    }

    return catalog;
  }
}

/**
 * Main parse entry point for TikZ diagram sources.
 * Throws ParseError or LexerError on invalid syntax.
 */
export function parseTikz(source: string): GraphAST {
  const lexer = new TikzLexer(source);
  const tokens = lexer.tokenize();
  const parser = new TikzParser(tokens);
  return parser.parsePicture();
}

/**
 * Main parse entry point for .tikzstyles files.
 */
export function parseTikzStyles(source: string): TikzStylesCatalog {
  const lexer = new TikzLexer(source);
  const tokens = lexer.tokenize();
  const parser = new TikzParser(tokens);
  return parser.parseStyles();
}

/**
 * Safe parser for editor integration and browser test harness.
 * Catches lexer and parser errors and returns diagnostic reports with partial AST.
 */
export function parseSafe(source: string): SafeParseResult {

  const errors: ParseDiagnostic[] = [];
  let ast: GraphAST | null = null;
  let partialAST: GraphAST | null = null;

  try {
    const lexer = new TikzLexer(source);
    const tokens = lexer.tokenize();
    const parser = new TikzParser(tokens);

    try {
      ast = parser.parsePicture();
      partialAST = ast;
      return {
        success: true,
        ast,
        partialAST,
        errors: [],
      };
    } catch (err: any) {
      partialAST = parser.getPartialAST();
      errors.push({
        line: err.line || 1,
        column: err.column || 1,
        message: err.message || String(err),
        severity: 'error',
      });
      return {
        success: false,
        ast: null,
        partialAST: partialAST || createEmptyAST(),
        errors,
      };
    }
  } catch (err: any) {
    errors.push({
      line: err.line || 1,
      column: err.column || 1,
      message: err.message || String(err),
      severity: 'error',
    });
    return {
      success: false,
      ast: null,
      partialAST: createEmptyAST(),
      errors,
    };
  }
}

export const safeParse = parseSafe;
