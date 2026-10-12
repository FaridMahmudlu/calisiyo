// iOS widgets can only be added from the home screen editor.
export const canPinWidgets = false;
export type PinnableWidget = 'today' | 'quickFocus';

export async function pinWidget(_widget: PinnableWidget) {
  return false;
}
