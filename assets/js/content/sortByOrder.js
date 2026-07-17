export function resolveOrder(item, fallbackIndex = 0) {
  const value = item?.order;
  if (value === undefined || value === null || value === "") {
    return fallbackIndex;
  }

  const order = Number(value);
  return Number.isFinite(order) ? order : fallbackIndex;
}

export function sortByOrder(items) {
  return [...(items ?? [])]
    .map((item, index) => ({ item, index }))
    .sort((first, second) => {
      const orderDiff = resolveOrder(first.item, first.index) - resolveOrder(second.item, second.index);
      return orderDiff !== 0 ? orderDiff : first.index - second.index;
    })
    .map(({ item }) => item);
}
