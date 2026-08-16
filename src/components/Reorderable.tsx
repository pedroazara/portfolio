import React from "react";
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

type Point = {
  x: number;
  y: number;
};

type MeasuredItem = {
  key: string;
  rect: DOMRect;
};

type DragState = {
  activeKey: string;
  pointerOffset: Point;
  pointer: Point;
  transform: Point;
  originalUserSelect: string;
  originalCursor: string;
};

type DragRenderState = {
  activeKey: string;
  transform: Point;
};

const REORDER_ANIMATION_MS = 180;
const REORDER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Drag-to-reorder list that works for both vertical lists and responsive grids.
 * The target index is computed from the real card positions, so side-by-side
 * cards reorder by row and column instead of by vertical movement only.
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
  const itemRefs = React.useRef(new Map<string, HTMLDivElement>());
  const latestItemsRef = React.useRef(items);
  const getKeyRef = React.useRef(getKey);
  const onReorderRef = React.useRef(onReorder);
  const dragStateRef = React.useRef<DragState | null>(null);
  const dragCleanupRef = React.useRef<(() => void) | null>(null);
  const layoutSnapshotRef = React.useRef<Map<string, DOMRect> | null>(null);
  const layoutAnimationTimeoutsRef = React.useRef(new Map<string, number>());
  const [dragRenderState, setDragRenderState] = React.useState<DragRenderState | null>(null);

  React.useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  React.useEffect(() => {
    getKeyRef.current = getKey;
  }, [getKey]);

  React.useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  React.useLayoutEffect(() => {
    const dragState = dragStateRef.current;
    const layoutSnapshot = layoutSnapshotRef.current;
    layoutSnapshotRef.current = null;

    if (layoutSnapshot) {
      animateLayoutChanges(layoutSnapshot, itemRefs, layoutAnimationTimeoutsRef);
    }

    if (!dragState) return;
    updateDraggedTransform(dragState, itemRefs);
    setDragRenderState({
      activeKey: dragState.activeKey,
      transform: dragState.transform,
    });
  }, [items]);

  React.useEffect(() => {
    if (!isEditMode && dragStateRef.current) {
      finishDrag();
    }
  }, [isEditMode]);

  React.useEffect(() => {
    return () => {
      if (dragStateRef.current) {
        finishDrag();
      }

      for (const timeout of layoutAnimationTimeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }
      layoutAnimationTimeoutsRef.current.clear();
    };
  }, []);

  const classFor = (item: T, index: number) =>
    typeof itemClassName === "function" ? itemClassName(item, index) : itemClassName;

  const setItemRef = React.useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) {
      itemRefs.current.set(key, node);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  const measureItems = React.useCallback((activeKey: string): MeasuredItem[] => {
    return latestItemsRef.current.flatMap((item) => {
      const key = getKeyRef.current(item);
      if (key === activeKey) return [];

      const node = itemRefs.current.get(key);
      if (!node) return [];

      return [{ key, rect: node.getBoundingClientRect() }];
    });
  }, []);

  const startDrag = React.useCallback(
    (event: React.PointerEvent, activeKey: string) => {
      if (event.button !== 0) return;

      const activeNode = itemRefs.current.get(activeKey);
      if (!activeNode) return;

      finishDrag();

      const rect = activeNode.getBoundingClientRect();
      const pointer = { x: event.clientX, y: event.clientY };
      const dragState: DragState = {
        activeKey,
        pointerOffset: {
          x: pointer.x - rect.left,
          y: pointer.y - rect.top,
        },
        pointer,
        transform: { x: 0, y: 0 },
        originalUserSelect: document.body.style.userSelect,
        originalCursor: document.body.style.cursor,
      };

      event.preventDefault();
      event.stopPropagation();

      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      dragStateRef.current = dragState;
      setDragRenderState({ activeKey, transform: dragState.transform });

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const currentDrag = dragStateRef.current;
        if (!currentDrag) return;

        moveEvent.preventDefault();
        currentDrag.pointer = { x: moveEvent.clientX, y: moveEvent.clientY };

        const measuredItems = measureItems(currentDrag.activeKey);
        const insertionIndex = getInsertionIndex(measuredItems, currentDrag.pointer);
        const reorderedItems = getReorderedItems(
          latestItemsRef.current,
          getKeyRef.current,
          currentDrag.activeKey,
          insertionIndex
        );

        if (reorderedItems) {
          layoutSnapshotRef.current = captureLayoutSnapshot(
            currentDrag.activeKey,
            itemRefs,
            layoutAnimationTimeoutsRef
          );
          onReorderRef.current(reorderedItems);
        }

        updateDraggedTransform(currentDrag, itemRefs);
        setDragRenderState({
          activeKey: currentDrag.activeKey,
          transform: currentDrag.transform,
        });
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        finishDrag();
      };

      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      dragCleanupRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        dragCleanupRef.current = null;
      };
    },
    [measureItems]
  );

  if (!isEditMode) {
    return (
      <div className={className}>
        {items.map((item, index) => {
          const key = getKey(item);
          return (
            <div key={key} className={classFor(item, index)}>
              {children(item, null, index)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => {
        const key = getKey(item);
        const isDragging = dragRenderState?.activeKey === key;
        const itemClasses = [classFor(item, index), isDragging ? "relative z-50 select-none" : undefined]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={key}
            ref={(node) => setItemRef(key, node)}
            className={itemClasses || undefined}
            style={
              isDragging
                ? {
                    pointerEvents: "none",
                    transform: `translate3d(${dragRenderState.transform.x}px, ${dragRenderState.transform.y}px, 0)`,
                    transition: "none",
                    willChange: "transform",
                  }
                : undefined
            }
          >
            {children(item, <DragHandle onPointerDown={(event) => startDrag(event, key)} />, index)}
          </div>
        );
      })}
    </div>
  );

  function finishDrag() {
    const dragState = dragStateRef.current;
    dragCleanupRef.current?.();
    if (!dragState) return;

    document.body.style.userSelect = dragState.originalUserSelect;
    document.body.style.cursor = dragState.originalCursor;
    dragStateRef.current = null;
    setDragRenderState(null);
  }
}

function updateDraggedTransform(
  dragState: DragState,
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
) {
  const activeNode = itemRefs.current.get(dragState.activeKey);
  if (!activeNode) return;

  const transformedRect = activeNode.getBoundingClientRect();
  const layoutLeft = transformedRect.left - dragState.transform.x;
  const layoutTop = transformedRect.top - dragState.transform.y;

  dragState.transform = {
    x: dragState.pointer.x - dragState.pointerOffset.x - layoutLeft,
    y: dragState.pointer.y - dragState.pointerOffset.y - layoutTop,
  };
}

function captureLayoutSnapshot(
  activeKey: string,
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>,
  animationTimeouts: React.MutableRefObject<Map<string, number>>
) {
  const snapshot = new Map<string, DOMRect>();

  for (const [key, node] of itemRefs.current) {
    if (key === activeKey) continue;

    snapshot.set(key, node.getBoundingClientRect());

    const timeout = animationTimeouts.current.get(key);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      animationTimeouts.current.delete(key);
    }

    node.style.transition = "none";
    node.style.transform = "";
    node.style.willChange = "";
  }

  return snapshot;
}

function animateLayoutChanges(
  previousLayout: Map<string, DOMRect>,
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>,
  animationTimeouts: React.MutableRefObject<Map<string, number>>
) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  for (const [key, previousRect] of previousLayout) {
    const node = itemRefs.current.get(key);
    if (!node) continue;

    const nextRect = node.getBoundingClientRect();
    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

    node.style.transition = "none";
    node.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    node.style.willChange = "transform";
    node.getBoundingClientRect();

    node.style.transition = `transform ${REORDER_ANIMATION_MS}ms ${REORDER_EASING}`;
    node.style.transform = "translate3d(0, 0, 0)";

    const timeout = window.setTimeout(() => {
      if (animationTimeouts.current.get(key) !== timeout) return;

      node.style.transition = "";
      node.style.transform = "";
      node.style.willChange = "";
      animationTimeouts.current.delete(key);
    }, REORDER_ANIMATION_MS);

    animationTimeouts.current.set(key, timeout);
  }
}

function getReorderedItems<T>(
  items: T[],
  getKey: (item: T) => string,
  activeKey: string,
  insertionIndex: number
): T[] | null {
  const activeItem = items.find((item) => getKey(item) === activeKey);
  if (!activeItem) return null;

  const withoutActive = items.filter((item) => getKey(item) !== activeKey);
  const nextIndex = Math.max(0, Math.min(insertionIndex, withoutActive.length));
  const nextItems = [
    ...withoutActive.slice(0, nextIndex),
    activeItem,
    ...withoutActive.slice(nextIndex),
  ];

  return sameOrder(items, nextItems, getKey) ? null : nextItems;
}

function sameOrder<T>(a: T[], b: T[], getKey: (item: T) => string) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => getKey(item) === getKey(b[index]));
}

function getInsertionIndex(items: MeasuredItem[], pointer: Point) {
  if (items.length === 0) return 0;

  const sortedItems = [...items].sort((a, b) => {
    const topDelta = a.rect.top - b.rect.top;
    return Math.abs(topDelta) > 8 ? topDelta : a.rect.left - b.rect.left;
  });

  const rows: Array<{
    top: number;
    bottom: number;
    startIndex: number;
    items: MeasuredItem[];
  }> = [];

  for (const item of sortedItems) {
    const lastRow = rows[rows.length - 1];

    if (!lastRow || Math.abs(item.rect.top - lastRow.top) > 8) {
      rows.push({
        top: item.rect.top,
        bottom: item.rect.bottom,
        startIndex: 0,
        items: [item],
      });
      continue;
    }

    lastRow.items.push(item);
    lastRow.top = Math.min(lastRow.top, item.rect.top);
    lastRow.bottom = Math.max(lastRow.bottom, item.rect.bottom);
  }

  let startIndex = 0;
  for (const row of rows) {
    row.items.sort((a, b) => a.rect.left - b.rect.left);
    row.startIndex = startIndex;
    startIndex += row.items.length;
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    if (pointer.y < row.top) {
      if (rowIndex === 0) return 0;

      const previousRow = rows[rowIndex - 1];
      const previousDistance = pointer.y - previousRow.bottom;
      const nextDistance = row.top - pointer.y;
      return previousDistance <= nextDistance
        ? previousRow.startIndex + previousRow.items.length
        : row.startIndex;
    }

    if (pointer.y <= row.bottom) {
      const columnIndex = row.items.findIndex((item) => pointer.x < item.rect.left + item.rect.width / 2);
      return row.startIndex + (columnIndex === -1 ? row.items.length : columnIndex);
    }
  }

  return items.length;
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
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPointerDown(event);
      }}
      onClick={(event) => event.stopPropagation()}
      className="shrink-0 touch-none cursor-grab text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 active:cursor-grabbing no-print print:hidden"
      title={label}
      aria-label={label}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

/**
 * Merges a reordered subset back into the full list it came from, preserving
 * the absolute position of every item that was not part of the subset (e.g.
 * items hidden by a filter or search query). Matches by `id`.
 */
export function mergeReorderedSubset<T extends { id: string }>(all: T[], reorderedSubset: T[]): T[] {
  const subsetIds = new Set(reorderedSubset.map((item) => item.id));
  let i = 0;
  return all.map((item) => (subsetIds.has(item.id) ? reorderedSubset[i++] : item));
}
