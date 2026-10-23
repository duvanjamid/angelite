export interface Options {
  components?: string[];
  members?: string[] | 'auto';
  pipes?: string[];
  elements?: string[];
  check?: 'warn' | 'error' | false;
}
export default function angelite(options?: Options): {
  name: string;
  enforce: 'pre';
  load(this: any, id: string): { code: string; map: null } | null;
  handleHotUpdate(ctx: { file: string; server: any }): [] | undefined;
};
