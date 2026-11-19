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
    const invalidIndex = Array.isArray(templates)
        ? templates.findIndex(template => getTemplateValidationError(template))
        : -1;
    if (!Array.isArray(templates) || invalidIndex >= 0) {
        const detail = invalidIndex >= 0
            ? `Vorlage ${invalidIndex + 1}: ${getTemplateValidationError(templates[invalidIndex])}`
            : 'Die Vorlagenliste ist kein Array.';
        throw new Error(`Die Etikettenvorlage ist ungültig und konnte nicht gespeichert werden. ${detail} Überschneidungen von Ausschnitten sind erlaubt.`);
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

    if (data?.version !== 1 || !Array.isArray(data.templates)) {
        throw new Error('Die Datei enthält keine gültigen snake_label-Vorlagen (Version 1).');
    }
    const invalidIndex = data.templates.findIndex(template => getTemplateValidationError(template));
    if (invalidIndex >= 0) {
        throw new Error(`Vorlage ${invalidIndex + 1} in der Datei: ${getTemplateValidationError(data.templates[invalidIndex])} Überschneidungen von Ausschnitten sind erlaubt.`);
    }

    return data.templates;
}

export function isValidTemplate(template) {
    return getTemplateValidationError(template) === null;
}

function getTemplateValidationError(template) {
    if (!template || typeof template !== 'object') return 'Vorlage fehlt oder ist kein Objekt.';
    if (typeof template.id !== 'string' || template.id.length === 0) return 'Die Vorlagen-ID fehlt.';
    if (typeof template.name !== 'string' || template.name.trim().length === 0) return 'Der Vorlagenname fehlt.';
    if (!Number.isFinite(template.lengthMm) || template.lengthMm < 25 || template.lengthMm > 300) {
        return 'Die Etikettenlänge muss zwischen 25 und 300 mm liegen.';
    }
    if (!Array.isArray(template.crops)) return 'Die Ausschnittliste ist ungültig.';
    if (template.crops.length === 0 || template.crops.length > 100) {
        return 'Die Vorlage muss zwischen 1 und 100 Ausschnitte enthalten.';
    }

    for (let index = 0; index < template.crops.length; index += 1) {
        const error = getCropValidationError(template.crops[index], template.lengthMm);
        if (error) return `Ausschnitt ${index + 1}: ${error}`;
    }
    return null;
}

function getCropValidationError(crop, lengthMm) {
    if (!crop || !crop.source || !crop.destination) return 'Quelle oder Zielposition fehlt.';
    const { x, y, width, height } = crop.source;
    const destination = crop.destination;

    if (![x, y, width, height].every(Number.isFinite)) return 'Die Quellfläche enthält ungültige Zahlenwerte.';
    if (x < 0 || y < 0 || width <= 0 || height <= 0) return 'Die Quellfläche hat eine ungültige Position oder Größe.';
    if (x + width > 1.000001 || y + height > 1.000001) return 'Die Quellfläche liegt teilweise außerhalb der Quelldatei.';
    if (!['x', 'y', 'width', 'height', 'rotation'].every(key => Number.isFinite(destination[key]))) {
        return 'Die Zielposition enthält ungültige Zahlenwerte.';
    }
    if (destination.width <= 0 || destination.height <= 0) return 'Die Zielgröße muss größer als 0 sein.';
    if (Math.abs(destination.rotation) > 36000) return 'Der Drehwinkel ist ungültig.';

    const targetWidth = (lengthMm - 6) * 300 / 25.4;
    const targetHeight = 696;
    const angle = destination.rotation * Math.PI / 180;
    const halfWidth = (Math.abs(Math.cos(angle)) * destination.width +
        Math.abs(Math.sin(angle)) * destination.height) / 2;
    const halfHeight = (Math.abs(Math.sin(angle)) * destination.width +
        Math.abs(Math.cos(angle)) * destination.height) / 2;
    const centerX = destination.x + destination.width / 2;
    const centerY = destination.y + destination.height / 2;

    if (centerX - halfWidth < -0.001 || centerX + halfWidth > targetWidth + 0.001 ||
        centerY - halfHeight < -0.001 || centerY + halfHeight > targetHeight + 0.001) {
        return 'Die Zielposition liegt außerhalb der Etikettenfläche.';
    }
    return null;
}
