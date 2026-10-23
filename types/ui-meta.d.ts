export interface InputDoc { name: string; type: string; default: string; desc: string }
export interface OutputDoc { name: string; payload: string; desc: string }
export interface SlotDoc { name: string; desc: string }
export interface ComponentDoc {
  id: string; name: string; tag: string; group: string; summary: string;
  inputs: InputDoc[]; outputs: OutputDoc[]; slots: SlotDoc[];
  /** Accessibility behaviour in one paragraph. */
  a11y: string;
}
export const groups: string[];
export const meta: ComponentDoc[];
