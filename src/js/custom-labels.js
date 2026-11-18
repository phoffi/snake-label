const STORAGE_KEY = 'snake-label.custom-labels.v1';

export function createTemplateId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadCustomTemplates() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];

    return parseTemplates(stored);
}

export function saveCustomTemplates(templates) {
    if (!Array.isArray(templates) || !templates.every(isValidTemplate)) {
        throw new Error('Die Etikettenvorlage ist ungültig und konnte nicht gespeichert werden.');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, templates }));
}

export function parseTemplates(json) {
    let data;
    try {
        data = JSON.parse(json);
    } catch {
        throw new Error('Die JSON-Datei ist ungültig oder beschädigt.');
    }

    if (data?.version !== 1 || !Array.isArray(data.templates) ||
        !data.templates.every(isValidTemplate)) {
        throw new Error('Die Datei enthält keine gültigen snake_label-Vorlagen (Version 1).');
    }

    return data.templates;
}

export function isValidTemplate(template) {
    return Boolean(
        template &&
        typeof template.id === 'string' && template.id.length > 0 &&
        typeof template.name === 'string' && template.name.trim().length > 0 &&
        Number.isFinite(template.lengthMm) && template.lengthMm >= 25 && template.lengthMm <= 300 &&
        Array.isArray(template.crops) && template.crops.length > 0 && template.crops.length <= 100 &&
        template.crops.every(isValidCrop)
    );
}

function isValidCrop(crop) {
    if (!crop || !crop.source || !crop.destination) return false;
    const { x, y, width, height } = crop.source;
    const destination = crop.destination;

    return [x, y, width, height].every(Number.isFinite) &&
        x >= 0 && y >= 0 && width > 0 && height > 0 &&
        x + width <= 1.000001 && y + height <= 1.000001 &&
        ['x', 'y', 'width', 'height', 'rotation'].every(key => Number.isFinite(destination[key])) &&
        destination.x >= 0 && destination.y >= 0 &&
        destination.width > 0 && destination.height > 0 &&
        Math.abs(destination.rotation) <= 36000;
}
