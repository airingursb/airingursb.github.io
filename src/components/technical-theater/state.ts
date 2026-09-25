export type ObjectId = 'A' | 'B' | 'C' | 'D';
export type HeapObject = Readonly<{ id: ObjectId; references: readonly ObjectId[] }>;
export type Phase = 'allocated' | 'marked' | 'swept';
export const heap: readonly HeapObject[] = [
  { id: 'A', references: ['B'] }, { id: 'B', references: [] },
  { id: 'C', references: ['D'] }, { id: 'D', references: ['C'] },
];

export function reachableObjects(objects: readonly HeapObject[], roots: readonly ObjectId[]): readonly ObjectId[] {
  const remaining: ObjectId[] = [...roots];
  const marked = new Set<ObjectId>();
  while (remaining.length) {
    const next = remaining.pop();
    if (!next || marked.has(next)) continue;
    const object = objects.find(candidate => candidate.id === next);
    if (!object) continue;
    marked.add(next);
    remaining.push(...object.references);
  }
  return objects.filter(object => marked.has(object.id)).map(object => object.id);
}

export function sweepObjects(objects: readonly HeapObject[], marked: readonly ObjectId[]): readonly ObjectId[] {
  return objects.filter(object => !marked.includes(object.id)).map(object => object.id);
}
