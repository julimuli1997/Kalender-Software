export const odooColors = [
  '#017e84',
  '#b05c38',
  '#875a7b',
  '#21b799',
  '#3b7ebf',
  '#e4a900',
  '#d83232',
  '#8f8f8f'
];

export const assignColors = (rawEvents, mitarbeiterList) => {
  const colorMap = {};
  mitarbeiterList.forEach((m, index) => {
    colorMap[m.id] = odooColors[index % odooColors.length];
  });

  return rawEvents.map(event => {
    const color = colorMap[event.mitarbeiter_id] || '#6c757d';
    return { ...event, backgroundColor: color, borderColor: color };
  });
};
