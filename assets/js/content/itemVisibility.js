export function isItemVisible(item) {
  if (item?.is_visible === false) {
    return false;
  }

  return Number(item?.is_visible) !== 0;
}

export function filterVisibleItems(items) {
  return (items ?? []).filter(isItemVisible);
}
