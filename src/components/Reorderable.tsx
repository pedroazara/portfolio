import React from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical } from "lucide-react";

interface ReorderableListProps<T> {
  items: T[];
  isEditMode: boolean;
  onReorder: (newOrder: T[]) => void;
  getKey: (item: T) => string;
  className?: string;
  itemClassName?: string | ((item: T, index: number) => string);
  children: (item: T, dragHandle: React.ReactNode, index: number) => React.ReactNode;
}

/**
 * Drag-to-reorder list, built on `motion`'s `Reorder` (already a project
 * dependency — no extra library needed). Outside edit mode it renders a
 * plain list with no drag machinery at all.
 *
 * Dragging is handle-only (`dragListener={false}` + a dedicated grip button)
 * so it never intercepts clicks on the card itself or on edit/delete buttons.
 */
export function ReorderableList<T>({
  items,
  isEditMode,
  onReorder,
  getKey,
  className,
  itemClassName,
  children,
}: ReorderableListProps<T>) {
  const classFor = (item: T, index: number) =>
    typeof itemClassName === "function" ? itemClassName(item, index) : itemClassName;

  if (!isEditMode) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={getKey(item)} className={classFor(item, index)}>
            {children(item, null, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Reorder.Group as="div" axis="y" values={items} onReorder={onReorder} className={className}>
      {items.map((item, index) => (
        <ReorderableRow key={getKey(item)} item={item} className={classFor(item, index)}>
          {(dragHandle) => children(item, dragHandle, index)}
        </ReorderableRow>
      ))}
    </Reorder.Group>
  );
}

function ReorderableRow<T>({
  item,
  className,
  children,
}: {
  item: T;
  className?: string;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const controls = useDragControls();
  const dragHandle = <DragHandle onPointerDown={(e) => controls.start(e)} />;

  return (
    <Reorder.Item as="div" value={item} dragListener={false} dragControls={controls} className={className}>
      {children(dragHandle)}
    </Reorder.Item>
  );
}

export function DragHandle({
  onPointerDown,
  label = "Arrastar para reordenar",
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 touch-none cursor-grab text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 active:cursor-grabbing no-print print:hidden"
      title={label}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

/**
 * Merges a reordered subset back into the full list it came from, preserving
 * the absolute position of every item that wasn't part of the subset (e.g.
 * items hidden by a filter or search query). Matches by `id`.
 */
export function mergeReorderedSubset<T extends { id: string }>(all: T[], reorderedSubset: T[]): T[] {
  const subsetIds = new Set(reorderedSubset.map((item) => item.id));
  let i = 0;
  return all.map((item) => (subsetIds.has(item.id) ? reorderedSubset[i++] : item));
}
