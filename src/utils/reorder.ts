/**
 * Utility for reordering arrays (Drag and Drop)
 */
export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  if (startIndex === endIndex || startIndex < 0 || endIndex < 0 || startIndex >= list.length || endIndex >= list.length) {
    return list;
  }
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}
