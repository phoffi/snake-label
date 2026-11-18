import getLabel from './labels'
import { loadCustomTemplates, parseTemplates, saveCustomTemplates, createTemplateId } from './custom-labels';
import { openLabelEditor } from './label-editor';
import { loadPrinterUrl, printLabel, savePrinterUrl, testPrinterConnection } from './print';

import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';
import { saveAs } from 'file-saver';

const debug = false;
const fileInput = document.getElementById('file-input');
const labelSelect = document.getElementById('label-type');
const convertButton = document.getElementById('convertLabel');
const outputView = document.getElementById('view');
const outputImage = document.getElementById('labelImg');
const appStatus = document.getElementById('app-status');
const printButton = document.getElementById('printLabelBtn');
const printStatus = document.getElementById('print-status');
const printerUrlInput = document.getElementById('printer-url');
const customOptionGroup = document.createElement('optgroup');
customOptionGroup.label = 'Eigene Etiketten';
customOptionGroup.id = 'custom-label-options';
labelSelect.append(customOptionGroup);

let customTemplates = [];
let labelArrayBuffer;
let outputCanvas;
let sourceCanvas;
let sourceImage = new Image();
let currentLabel;
let outputWidth;
let printing = false;

debug && (document.getElementById('downloadPageIMG').hidden = false);
console.log('Application loaded. debug =', debug);

document.getElementById('convertLabel').addEventListener('click', convertLabel);
document.getElementById('downloadLabel').addEventListener('click', saveLabel);
document.getElementById('downloadLabelIMG').addEventListener('click', savePNG);
document.getElementById('downloadPageIMG').addEventListener('click', savePagePNG);
printButton.addEventListener('click', sendToPrinter);
document.getElementById('save-printer-url').addEventListener('click', persistPrinterUrl);
document.getElementById('test-printer-url').addEventListener('click', checkPrinterConnection);
document.getElementById('create-custom-label').addEventListener('click', createOrEditCustomLabel);
document.getElementById('export-custom-labels').addEventListener('click', exportCustomLabels);
document.getElementById('import-custom-labels').addEventListener('click', () => {
    document.getElementById('custom-label-file').click();
});
document.getElementById('custom-label-file').addEventListener('change', importCustomLabels);
labelSelect.addEventListener('change', updateEditorButton);

try {
    customTemplates = loadCustomTemplates();
    refreshCustomOptions();
} catch (error) {
    showError(error);
}
try {
    printerUrlInput.value = loadPrinterUrl();
} catch (error) {
    showError(error);
}

async function savePNG() {
    if (!labelArrayBuffer) return showError(new Error('Bitte zuerst ein Etikett erzeugen.'));
    saveAs(
        new Blob([labelArrayBuffer], { type: 'image/png' }),
        outputFilename('-Label.png')
    );
}

function savePagePNG() {
    if (!sourceCanvas) return showError(new Error('Bitte zuerst eine Datei laden.'));
    sourceCanvas.toBlob(blob => saveAs(blob, outputFilename('.png')), 'image/png');
}

async function saveLabel() {
    try {
        if (!labelArrayBuffer) throw new Error('Bitte zuerst ein Etikett erzeugen.');
        const pdfBytes = await generatePDF();
        saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), outputFilename('-Label.pdf'));
    } catch (error) {
        showError(error);
    }
}

async function generatePDF() {
    const pdfDoc = await PDFDocument.create();

    // size in 72dpi
    // page borders: ends 3mm, top/bottom 1.5mm
    const width = pxTo72Dpi(outputWidth) + mmTo72Dpi(6),
        height = mmTo72Dpi(62);
    const page = pdfDoc.addPage([width, height]);

    const labelImage = await pdfDoc.embedPng(labelArrayBuffer);
    page.drawImage(labelImage, {
        x: mmTo72Dpi(3),
        y: mmTo72Dpi(1.5),
        width: pxTo72Dpi(outputWidth),
        height: height - mmTo72Dpi(3),
    });

    return pdfDoc.save();

    function mmTo72Dpi(length) { return length * 0.03937007874 * 72; }
    function pxTo72Dpi(pixels) { return pixels * 72 / 300; }
}

async function convertLabel() {
    try {
        const file = selectedFile();
        currentLabel = selectedLabel();
        if (!currentLabel) throw new Error('Bitte wähle eine gültige Etikettenvorlage aus.');
        if (!file) throw new Error('Bitte wähle zuerst eine PDF- oder Bilddatei aus.');
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (!currentLabel.custom && currentLabel.file?.type === 'pdf' && !isPdf) {
            throw new Error('Diese vordefinierte Vorlage benötigt eine PDF-Datei.');
        }
        if (!currentLabel.custom && currentLabel.file?.type === 'gif' && isPdf) {
            throw new Error('Diese vordefinierte Vorlage benötigt eine Bilddatei.');
        }

        convertButton.disabled = true;
        updatePrintButton();
        appStatus.textContent = 'Datei wird verarbeitet …';
        sourceCanvas = await renderSource(file, currentLabel);
        sourceImage = sourceCanvas;

        outputCanvas = document.createElement('canvas');
        outputCanvas.width = currentLabel.custom
            ? Math.round((currentLabel.lengthMm - 6) * 300 / 25.4)
            : currentLabel.width;
        outputCanvas.height = 696; // 59mm printable width for 62mm QL labels
        outputWidth = outputCanvas.width;

        const context = outputCanvas.getContext('2d');
        context.fillStyle = debug ? 'lightgreen' : 'white';
        context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
        if (debug) {
            context.fillStyle = 'pink';
            context.fillRect(0, 0, outputCanvas.width, 12);
            context.fillRect(0, outputCanvas.height - 12, outputCanvas.width, 12);
        }

        if (currentLabel.custom) drawCustomLabel(context, currentLabel);
        else currentLabel.crop(outputCanvas, context, sourceImage);

        labelArrayBuffer = await canvasToBlob(outputCanvas, 'image/png').then(blob => blob.arrayBuffer());
        outputImage.src = outputCanvas.toDataURL('image/png');
        outputView.classList.remove('invisible');
        appStatus.textContent = '';
    } catch (error) {
        showError(error);
    } finally {
        convertButton.disabled = false;
        updatePrintButton();
    }
}

async function sendToPrinter() {
    if (!outputCanvas || !labelArrayBuffer) {
        setPrintStatus('Bitte zuerst ein Etikett erzeugen.', 'error');
        return;
    }

    printing = true;
    updatePrintButton();
    setPrintStatus('Druckauftrag wird gesendet …', 'neutral');
    try {
        const printerUrl = savePrinterUrl(printerUrlInput.value);
        printerUrlInput.value = printerUrl;
        const result = await printLabel(outputCanvas, printerUrl);
        setPrintStatus(
            result.success ? 'Druckauftrag wurde erfolgreich gesendet.' :
                result.error || 'Der Druckauftrag ist fehlgeschlagen.',
            result.success ? 'success' : 'error'
        );
    } catch (error) {
        setPrintStatus(error.message || 'Der Druckauftrag ist fehlgeschlagen.', 'error');
        console.error(error);
    } finally {
        printing = false;
        updatePrintButton();
    }
}

function persistPrinterUrl() {
    try {
        printerUrlInput.value = savePrinterUrl(printerUrlInput.value);
        setPrintStatus('Druckdienst-Adresse wurde lokal gespeichert.', 'success');
    } catch (error) {
        setPrintStatus(error.message, 'error');
    }
}

async function checkPrinterConnection() {
    const button = document.getElementById('test-printer-url');
    button.disabled = true;
    setPrintStatus('Verbindung wird geprüft …', 'neutral');
    try {
        printerUrlInput.value = savePrinterUrl(printerUrlInput.value);
        const result = await testPrinterConnection(printerUrlInput.value);
        setPrintStatus(
            result.success ? 'Druckdienst ist erreichbar.' : result.error,
            result.success ? 'success' : 'error'
        );
    } catch (error) {
        setPrintStatus(error.message || 'Die Verbindung konnte nicht geprüft werden.', 'error');
        console.error(error);
    } finally {
        button.disabled = false;
    }
}

function updatePrintButton() {
    printButton.disabled = !labelArrayBuffer || convertButton.disabled || printing;
}

function setPrintStatus(message, state) {
    const color = {
        error: 'text-red-700',
        neutral: 'text-gray-700',
        success: 'text-green-700',
    }[state];
    printStatus.textContent = message;
    printStatus.className = `mt-3 text-center text-sm ${color}`;
}

async function createOrEditCustomLabel() {
    try {
        const file = selectedFile();
        if (!file) throw new Error('Lade zuerst ein Beispiel-PDF oder Bild hoch.');
        const template = getSelectedCustomTemplate();
        appStatus.textContent = 'Quelldatei wird für den Editor vorbereitet …';
        const source = await renderSource(file, { custom: true, file: { type: 'pdf', page: 1, rotation: 0 } });
        openLabelEditor(source, template, async updatedTemplate => {
            const nextTemplates = [...customTemplates];
            const index = nextTemplates.findIndex(item => item.id === updatedTemplate.id);
            if (index < 0) nextTemplates.push(updatedTemplate);
            else nextTemplates[index] = updatedTemplate;
            saveCustomTemplates(nextTemplates);
            customTemplates = nextTemplates;
            refreshCustomOptions(updatedTemplate.id);
            appStatus.textContent = 'Vorlage wurde lokal gespeichert.';
        });
        appStatus.textContent = '';
    } catch (error) {
        showError(error);
    }
}

async function renderSource(file, label) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (isPdf) {
        const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
        const pageNumber = label.file?.page || 1;
        if (pageNumber > pdf.numPages) {
            throw new Error(`Das PDF hat nur ${pdf.numPages} Seite(n); die Vorlage erwartet Seite ${pageNumber}.`);
        }
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({
            scale: label.custom ? 300 / 72 : label.scale || 4,
            rotation: label.custom ? 0 : label.file?.rotation || 0,
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        return canvas;
    }

    if (!file.type.startsWith('image/')) {
        throw new Error('Dateiformat nicht unterstützt. Bitte wähle ein PDF oder eine Bilddatei.');
    }
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('Die Bilddatei konnte nicht geöffnet werden.'));
            image.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function drawCustomLabel(context, template) {
    for (const crop of template.crops) {
        const source = crop.source;
        const destination = crop.destination;
        context.save();
        context.translate(destination.x + destination.width / 2, destination.y + destination.height / 2);
        context.rotate(destination.rotation * Math.PI / 180);
        context.drawImage(
            sourceImage,
            source.x * sourceImage.width,
            source.y * sourceImage.height,
            source.width * sourceImage.width,
            source.height * sourceImage.height,
            -destination.width / 2,
            -destination.height / 2,
            destination.width,
            destination.height
        );
        context.restore();
    }
}

function selectedLabel() {
    const custom = getSelectedCustomTemplate();
    if (custom) return { ...custom, custom: true };
    return getLabel(labelSelect.value);
}

function getSelectedCustomTemplate() {
    const prefix = 'custom:';
    if (!labelSelect.value.startsWith(prefix)) return null;
    return customTemplates.find(template => template.id === labelSelect.value.slice(prefix.length)) || null;
}

function refreshCustomOptions(selectedId) {
    customOptionGroup.replaceChildren();
    for (const template of customTemplates) {
        const option = document.createElement('option');
        option.value = `custom:${template.id}`;
        option.textContent = `${template.name} | 62x${Math.round(template.lengthMm)}mm`;
        customOptionGroup.append(option);
    }
    customOptionGroup.hidden = customTemplates.length === 0;
    if (selectedId) labelSelect.value = `custom:${selectedId}`;
    updateEditorButton();
}

function updateEditorButton() {
    document.getElementById('create-custom-label').textContent =
        getSelectedCustomTemplate() ? 'Ausgewähltes Etikett bearbeiten' : 'Neues Etikett gestalten';
}

async function importCustomLabels(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
        const imported = parseTemplates(await file.text());
        const ids = new Set(customTemplates.map(template => template.id));
        const additions = imported.map(template => {
            const copy = structuredClone(template);
            if (ids.has(copy.id)) copy.id = createTemplateId();
            ids.add(copy.id);
            return copy;
        });
        const nextTemplates = [...customTemplates, ...additions];
        saveCustomTemplates(nextTemplates);
        customTemplates = nextTemplates;
        refreshCustomOptions();
        appStatus.textContent = `${additions.length} Vorlage(n) importiert und lokal gespeichert.`;
    } catch (error) {
        showError(error);
    }
}

function exportCustomLabels() {
    try {
        if (!customTemplates.length) throw new Error('Es gibt noch keine eigenen Vorlagen zum Exportieren.');
        const data = JSON.stringify({ version: 1, templates: customTemplates }, null, 2);
        saveAs(new Blob([data], { type: 'application/json' }), 'snake-label-vorlagen.json');
        appStatus.textContent = `${customTemplates.length} Vorlage(n) exportiert.`;
    } catch (error) {
        showError(error);
    }
}

function selectedFile() {
    return fileInput.files?.[0] || null;
}

function outputFilename(suffix) {
    const file = selectedFile();
    const baseName = file?.name?.replace(/\.(pdf|gif|png|jpe?g|webp|bmp|tiff?)$/i, '') || 'snake-label';
    return `${baseName}${suffix}`;
}

function showError(error) {
    appStatus.textContent = error?.message || 'Ein unerwarteter Fehler ist aufgetreten.';
    console.error(error);
}

function canvasToBlob(canvas, type) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Das Etikett konnte nicht als Bild erzeugt werden.')), type);
    });
}