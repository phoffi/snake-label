const CONFIG_KEY = 'snake-label.printer-url';
const DEFAULT_PRINTER_URL = 'http://localhost:8013';

export function loadPrinterUrl() {
    return localStorage.getItem(CONFIG_KEY) || DEFAULT_PRINTER_URL;
}

export function savePrinterUrl(value) {
    const url = normalizePrinterUrl(value);
    localStorage.setItem(CONFIG_KEY, url);
    return url;
}

export async function testPrinterConnection(value) {
    const baseUrl = normalizePrinterUrl(value);
    let response;
    try {
        response = await fetch(`${baseUrl}/labeldesigner/api/font/styles`);
    } catch (error) {
        if (error instanceof TypeError) {
            return {
                success: false,
                error: 'Keine Verbindung. Prüfe die Adresse und ob CORS in brother_ql_web aktiviert ist.',
            };
        }
        throw error;
    }

    return response.ok
        ? { success: true }
        : { success: false, error: `Der Druckdienst antwortet mit HTTP ${response.status}.` };
}

export async function printLabel(canvas, value) {
    const baseUrl = normalizePrinterUrl(value);
    const image = await rotateCanvas(canvas);
    const formData = new FormData();
    formData.append('image', image, 'label.png');
    formData.append('print_type', 'image');
    formData.append('image_mode', 'grayscale');
    formData.append('label_size', '62');
    formData.append('margin_top', '0');
    formData.append('margin_bottom', '0');
    formData.append('margin_left', '0');
    formData.append('margin_right', '0');

    let response;
    try {
        response = await fetch(`${baseUrl}/labeldesigner/api/print`, {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        if (error instanceof TypeError) {
            return {
                success: false,
                error: 'Druckauftrag konnte nicht gesendet werden. Prüfe die Adresse und die CORS-Einstellungen von brother_ql_web.',
            };
        }
        throw error;
    }

    let result;
    try {
        result = await response.json();
    } catch {
        return {
            success: false,
            error: `Ungültige Antwort vom Druckdienst (HTTP ${response.status}).`,
        };
    }

    if (!response.ok) {
        return {
            success: false,
            error: result?.error || `Der Druckdienst antwortet mit HTTP ${response.status}.`,
        };
    }
    if (typeof result?.success !== 'boolean') {
        return { success: false, error: 'Der Druckdienst hat den Auftrag nicht eindeutig bestätigt.' };
    }
    return result;
}

function normalizePrinterUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error('Bitte gib eine gültige Druckdienst-Adresse ein.');
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.search || url.hash) {
        throw new Error('Die Druckdienst-Adresse muss HTTP oder HTTPS verwenden und darf keine Zugangsdaten, Suchparameter oder Fragmente enthalten.');
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

function rotateCanvas(canvas) {
    const rotated = document.createElement('canvas');
    rotated.width = canvas.height;
    rotated.height = canvas.width;
    const context = rotated.getContext('2d');
    if (!context) throw new Error('Das Druckbild konnte nicht vorbereitet werden.');
    context.translate(rotated.width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(canvas, 0, 0);

    return new Promise((resolve, reject) => {
        rotated.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Das Druckbild konnte nicht erzeugt werden.'));
        }, 'image/png');
    });
}
