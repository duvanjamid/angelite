export interface TemplateOptions {
  /** Tags (lowercase) that are components, e.g. ['ui-button']. */
  components?: string[];
  /** The component's fields and methods; enables the "is not a member" check. */
  members?: string[];
  /** Custom pipes registered with registerPipe(). */
  pipes?: string[];
  /** Custom elements (web components) that are not AngeLite components. */
  elements?: string[];
}

export interface CompileOptions extends TemplateOptions {
  /** What to do with problems: log them (default), throw, or ignore. */
  check?: 'warn' | 'error' | false;
}

/** Compiles a template to the source of an ES module whose default export is the `aot` factory. */
export function compileTemplate(source: string, options?: CompileOptions): string;
/** Lists problems in a template: unknown elements, unknown pipes and, with `members`, unknown names. */
export function checkTemplate(source: string, options?: TemplateOptions): string[];
/** Best-effort list of a component's fields and methods read from the class file next to `x.ng.html`. */
export function discoverMembers(file: string): string[];

export interface PluginOptions extends Omit<CompileOptions, 'members'> {
  /** An explicit list, or 'auto' to read it from the class file next to the template. */
  members?: string[] | 'auto';
}
export function aotPlugin(options?: PluginOptions): { name: string; setup(build: any): void };
