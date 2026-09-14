export const odooColors = [
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#7c3aed', // Violet
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0284c7', // Sky Blue
  '#059669', // Emerald
  '#c026d3'  // Fuchsia
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
