export interface PromptState {
  text: string;
  dirty: boolean;
}

export type PromptAction =
  | { type: "template"; value: string }
  | { type: "edit"; value: string }
  | { type: "reset"; value: string };

export function initialPromptState(text: string): PromptState {
  return { text, dirty: false };
}

export function reducePromptState(state: PromptState, action: PromptAction): PromptState {
  switch (action.type) {
    case "template":
      return state.dirty ? state : { text: action.value, dirty: false };
    case "edit":
      return { text: action.value, dirty: true };
    case "reset":
      return { text: action.value, dirty: false };
  }
}
