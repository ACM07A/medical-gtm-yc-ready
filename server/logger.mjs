export function structuredLog(event, fields = {}, level = "info") {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "canopus-care",
    ...fields,
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else console.log(line);
}
