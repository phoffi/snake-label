import { createTemplateId } from './custom-labels';

const dialog = document.getElementById('label-editor');
const sourceCanvas = document.getElementById('editor-source');
const targetCanvas = document.getElementById('editor-target');
const sourceContext = sourceCanvas.getContext('2d');
const targetContext = targetCanvas.getContext('2d');
const cropList = document.getElementById('editor-crop-list');
const status = document.getElementById('editor-status');
const nameInput = document.getElementById('editor-name');
const lengthInput = document.getElementById('editor-length');

let originalSource;
let crops = [];
let selectedCrop = -1;
let selection = null;
let sourcePointer = null;
let targetPointer = null;
let onSave;
let existingTemplate;

document.getElementById('editor-close').addEventListener('click', () => dialog.close());
document.getElementById('editor-add-crop').addEventListener('click', addCrop);
document.getElementById('editor-zoom-in').addEventListener('click', () => scaleSelected(1.1));
document.getElementById('editor-zoom-out').addEventListener('click', () => scaleSelected(1 / 1.1));
document.getElementById('editor-rotate').addEventListener('click', rotateSelected);
document.getElementById('editor-remove-crop').addEventListener('click', removeSelected);
document.getElementById('editor-save').addEventListener('click', saveTemplate);
lengthInput.addEventListener('input', resizeTarget);

sourceCanvas.addEventListener('pointerdown', event => {
    const point = canvasPoint(sourceCanvas, event);
    sourcePointer = point;
    selection = { x: point.x, y: point.y, width: 0, height: 0 };
    sourceCanvas.setPointerCapture(event.pointerId);
    drawSource();
});
sourceCanvas.addEventListener('pointermove', event => {
    if (!sourcePointer) return;
    const point = canvasPoint(sourceCanvas, event);
    selection = rectangle(sourcePointer, point);
    drawSource();
    document.getElementById('editor-add-crop').disabled = selection.width < 2 || selection.height < 2;
});
sourceCanvas.addEventListener('pointerup', event => {
    if (sourcePointer) {
        const point = canvasPoint(sourceCanvas, event);
        selection = rectangle(sourcePointer, point);
        sourcePointer = null;
        drawSource();
        document.getElementById('editor-add-crop').disabled = selection.width < 2 || selection.height < 2;
    }
});
sourceCanvas.addEventListener('pointercancel', () => { sourcePointer = null; });

targetCanvas.addEventListener('pointerdown', event => {
    const point = canvasPoint(targetCanvas, event);
    const handle = selectedCrop < 0 ? null : hitTestHandle(point, crops[selectedCrop].destination);
    if (!handle) selectedCrop = hitTest(point);
    const crop = crops[selectedCrop];
    targetPointer = crop ? {
        mode: handle || 'move',
        x: point.x,
        y: point.y,
        destination: { ...crop.destination },
        pointerAngle: Math.atan2(
            point.y - crop.destination.y - crop.destination.height / 2,
            point.x - crop.destination.x - crop.destination.width / 2
        ),
    } : null;
    targetCanvas.setPointerCapture(event.pointerId);
    drawTarget();
    drawCropList();
});
targetCanvas.addEventListener('pointermove', event => {
    const point = canvasPoint(targetCanvas, event);
    if (!targetPointer) {
        updateTargetCursor(point);
        return;
    }

    const crop = crops[selectedCrop];
    const start = targetPointer.destination;
    if (targetPointer.mode === 'move') {
        crop.destination.x = start.x + point.x - targetPointer.x;
        crop.destination.y = start.y + point.y - targetPointer.y;
        keepCropInBounds(crop.destination);
    } else if (targetPointer.mode === 'rotate') {
        const centerX = start.x + start.width / 2;
        const centerY = start.y + start.height / 2;
        const pointerAngle = Math.atan2(point.y - centerY, point.x - centerX);
        crop.destination.rotation = normalizeRotation(
            Math.round((start.rotation +
                (pointerAngle - targetPointer.pointerAngle) * 180 / Math.PI) / 90) * 90
        );
        keepCropInBounds(crop.destination);
    } else {
        resizeCropFromPointer(crop.destination, start, targetPointer.mode, point);
    }
    drawTarget();
});
targetCanvas.addEventListener('pointerup', () => {
    targetPointer = null;
    drawTarget();
});
targetCanvas.addEventListener('pointercancel', () => {
    targetPointer = null;
    drawTarget();
});

export function openLabelEditor(source, template, save) {
    originalSource = source;
    existingTemplate = template || null;
    onSave = save;
    crops = template ? structuredClone(template.crops) : [];
    selectedCrop = crops.length ? 0 : -1;
    selection = null;
    nameInput.value = template?.name || '';
    lengthInput.value = template?.lengthMm || 145;
    status.textContent = '';
    document.getElementById('editor-add-crop').disabled = true;
    sourceCanvas.width = source.width;
    sourceCanvas.height = source.height;
    dialog.showModal();
    resizeTarget();
    drawSource();
    drawCropList();
}

function addCrop() {
    if (!selection || selection.width < 2 || selection.height < 2) return;
    const maxWidth = targetCanvas.width;
    const maxHeight = targetCanvas.height;
    const fit = Math.min(1, maxWidth / selection.width, maxHeight / selection.height);
    const width = selection.width * fit;
    const height = selection.height * fit;

    crops.push({
        source: {
            x: selection.x / sourceCanvas.width,
            y: selection.y / sourceCanvas.height,
            width: selection.width / sourceCanvas.width,
            height: selection.height / sourceCanvas.height,
        },
        destination: {
            x: (targetCanvas.width - width) / 2,
            y: (targetCanvas.height - height) / 2,
            width,
            height,
            rotation: 0,
        },
    });
    selectedCrop = crops.length - 1;
    selection = null;
    document.getElementById('editor-add-crop').disabled = true;
    drawSource();
    drawTarget();
    drawCropList();
}

function resizeTarget() {
    const length = clamp(Number(lengthInput.value) || 145, 25, 300);
    targetCanvas.width = Math.round((length - 6) * 300 / 25.4);
    targetCanvas.height = 696;
    for (const crop of crops) keepCropInBounds(crop.destination);
    drawTarget();
}

function drawSource() {
    if (!originalSource) return;
    sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceContext.drawImage(originalSource, 0, 0);
    if (!selection || selection.width <= 0 || selection.height <= 0) return;
    sourceContext.fillStyle = 'rgba(0, 0, 0, 0.45)';
    sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceContext.clearRect(selection.x, selection.y, selection.width, selection.height);
    sourceContext.drawImage(
        originalSource,
        selection.x, selection.y, selection.width, selection.height,
        selection.x, selection.y, selection.width, selection.height
    );
    sourceContext.strokeStyle = '#16a34a';
    sourceContext.lineWidth = Math.max(2, sourceCanvas.width / 1000);
    sourceContext.setLineDash([12, 8]);
    sourceContext.strokeRect(selection.x, selection.y, selection.width, selection.height);
    sourceContext.setLineDash([]);
}

function drawTarget() {
    targetContext.fillStyle = 'white';
    targetContext.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetContext.strokeStyle = '#d1d5db';
    targetContext.lineWidth = 2;
    targetContext.strokeRect(1, 1, targetCanvas.width - 2, targetCanvas.height - 2);

    for (let index = 0; index < crops.length; index += 1) {
        const crop = crops[index];
        const destination = crop.destination;
        const source = crop.source;
        const sx = source.x * originalSource.width;
        const sy = source.y * originalSource.height;
        const sw = source.width * originalSource.width;
        const sh = source.height * originalSource.height;
        targetContext.save();
        targetContext.translate(destination.x + destination.width / 2, destination.y + destination.height / 2);
        targetContext.rotate(destination.rotation * Math.PI / 180);
        targetContext.drawImage(
            originalSource, sx, sy, sw, sh,
            -destination.width / 2, -destination.height / 2,
            destination.width, destination.height
        );
        targetContext.restore();
    }

    if (selectedCrop >= 0) drawSelection(crops[selectedCrop].destination);
}

function drawSelection(destination) {
    const { handleRadius, rotationOffset } = handleDimensions();
    const rotationHandleY = getRotationHandleY(destination, rotationOffset, handleRadius);
    const rotationAnchorY = rotationHandleY > destination.height / 2
        ? destination.height / 2
        : -destination.height / 2;
    targetContext.save();
    targetContext.translate(destination.x + destination.width / 2, destination.y + destination.height / 2);
    targetContext.rotate(destination.rotation * Math.PI / 180);
    targetContext.strokeStyle = '#16a34a';
    targetContext.lineWidth = 3;
    targetContext.strokeRect(
        -destination.width / 2, -destination.height / 2,
        destination.width, destination.height
    );
    targetContext.beginPath();
    targetContext.moveTo(0, rotationAnchorY);
    targetContext.lineTo(0, rotationHandleY);
    targetContext.stroke();
    for (const [x, y] of [
        [-destination.width / 2, -destination.height / 2],
        [destination.width / 2, -destination.height / 2],
        [-destination.width / 2, destination.height / 2],
        [destination.width / 2, destination.height / 2],
        [0, rotationHandleY],
    ]) {
        targetContext.beginPath();
        targetContext.arc(x, y, handleRadius, 0, Math.PI * 2);
        targetContext.fillStyle = 'white';
        targetContext.fill();
        targetContext.stroke();
    }
    targetContext.restore();
}

function drawCropList() {
    cropList.replaceChildren();
    crops.forEach((crop, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = `Ausschnitt ${index + 1}`;
        item.className = `border px-2 py-1 text-sm ${index === selectedCrop ? 'border-green-600 bg-green-100' : 'border-gray-300'}`;
        item.addEventListener('click', () => {
            selectedCrop = index;
            drawTarget();
            drawCropList();
        });
        cropList.append(item);
    });
    const hasSelection = selectedCrop >= 0;
    for (const id of ['editor-zoom-in', 'editor-zoom-out', 'editor-rotate', 'editor-remove-crop']) {
        document.getElementById(id).disabled = !hasSelection;
    }
}

function scaleSelected(factor) {
    const crop = crops[selectedCrop];
    if (!crop) return;
    setCropScale(crop.destination, { ...crop.destination }, factor);
    drawTarget();
}

function rotateSelected() {
    const crop = crops[selectedCrop];
    if (!crop) return;
    crop.destination.rotation = normalizeRotation(crop.destination.rotation + 90);
    keepCropInBounds(crop.destination);
    drawTarget();
}

function removeSelected() {
    if (selectedCrop < 0) return;
    crops.splice(selectedCrop, 1);
    selectedCrop = crops.length ? Math.min(selectedCrop, crops.length - 1) : -1;
    drawTarget();
    drawCropList();
}

function hitTest(point) {
    for (let index = crops.length - 1; index >= 0; index -= 1) {
        const destination = crops[index].destination;
        const local = pointInCrop(point, destination);
        if (Math.abs(local.x) <= destination.width / 2 &&
            Math.abs(local.y) <= destination.height / 2) {
            return index;
        }
    }
    return -1;
}

function hitTestHandle(point, destination) {
    const local = pointInCrop(point, destination);
    const { handleRadius, rotationOffset } = handleDimensions();
    const radius = handleRadius * 1.75;
    const corners = [
        ['resize-tl', -destination.width / 2, -destination.height / 2],
        ['resize-tr', destination.width / 2, -destination.height / 2],
        ['resize-bl', -destination.width / 2, destination.height / 2],
        ['resize-br', destination.width / 2, destination.height / 2],
        ['rotate', 0, getRotationHandleY(destination, rotationOffset, handleRadius)],
    ];
    for (const [handle, x, y] of corners) {
        if (Math.hypot(local.x - x, local.y - y) <= radius) return handle;
    }
    return null;
}

function pointInCrop(point, destination) {
    const centerX = destination.x + destination.width / 2;
    const centerY = destination.y + destination.height / 2;
    const angle = destination.rotation * Math.PI / 180;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return {
        x: dx * Math.cos(angle) + dy * Math.sin(angle),
        y: -dx * Math.sin(angle) + dy * Math.cos(angle),
    };
}

function resizeCropFromPointer(destination, start, handle, point) {
    const signs = {
        'resize-tl': [-1, -1],
        'resize-tr': [1, -1],
        'resize-bl': [-1, 1],
        'resize-br': [1, 1],
    }[handle];
    const fixedLocalX = -signs[0] * start.width / 2;
    const fixedLocalY = -signs[1] * start.height / 2;
    const local = pointInCrop(point, start);
    const dragX = local.x - fixedLocalX;
    const dragY = local.y - fixedLocalY;
    const diagonalX = signs[0] * start.width;
    const diagonalY = signs[1] * start.height;
    const scale = clampCropScale(start,
        (dragX * diagonalX + dragY * diagonalY) /
            (diagonalX * diagonalX + diagonalY * diagonalY)
    );
    destination.width = start.width * scale;
    destination.height = start.height * scale;

    const angle = start.rotation * Math.PI / 180;
    const fixedX = start.x + start.width / 2 +
        fixedLocalX * Math.cos(angle) - fixedLocalY * Math.sin(angle);
    const fixedY = start.y + start.height / 2 +
        fixedLocalX * Math.sin(angle) + fixedLocalY * Math.cos(angle);
    const centerOffsetX = signs[0] * destination.width / 2;
    const centerOffsetY = signs[1] * destination.height / 2;
    const centerX = fixedX + centerOffsetX * Math.cos(angle) - centerOffsetY * Math.sin(angle);
    const centerY = fixedY + centerOffsetX * Math.sin(angle) + centerOffsetY * Math.cos(angle);
    destination.x = centerX - destination.width / 2;
    destination.y = centerY - destination.height / 2;
    keepCropInBounds(destination);
}

function setCropScale(destination, start, factor) {
    const scale = clampCropScale(start, factor);
    destination.width = start.width * scale;
    destination.height = start.height * scale;
    destination.x = start.x + (start.width - destination.width) / 2;
    destination.y = start.y + (start.height - destination.height) / 2;
    keepCropInBounds(destination);
}

function clampCropScale(destination, factor) {
    const rotation = destination.rotation * Math.PI / 180;
    const cosine = Math.abs(Math.cos(rotation));
    const sine = Math.abs(Math.sin(rotation));
    const maxScale = Math.min(
        targetCanvas.width / (cosine * destination.width + sine * destination.height),
        targetCanvas.height / (sine * destination.width + cosine * destination.height)
    );
    return clamp(factor, Math.max(4 / destination.width, 4 / destination.height), maxScale);
}

function keepCropInBounds(destination) {
    const rotation = destination.rotation * Math.PI / 180;
    const halfWidth = (Math.abs(Math.cos(rotation)) * destination.width +
        Math.abs(Math.sin(rotation)) * destination.height) / 2;
    const halfHeight = (Math.abs(Math.sin(rotation)) * destination.width +
        Math.abs(Math.cos(rotation)) * destination.height) / 2;
    const centerX = halfWidth > targetCanvas.width / 2
        ? targetCanvas.width / 2
        : clamp(destination.x + destination.width / 2, halfWidth, targetCanvas.width - halfWidth);
    const centerY = halfHeight > targetCanvas.height / 2
        ? targetCanvas.height / 2
        : clamp(destination.y + destination.height / 2, halfHeight, targetCanvas.height - halfHeight);
    destination.x = centerX - destination.width / 2;
    destination.y = centerY - destination.height / 2;
}

function handleDimensions() {
    const bounds = targetCanvas.getBoundingClientRect();
    const handleRadius = 7 * targetCanvas.width / bounds.width;
    return { handleRadius, rotationOffset: handleRadius * 3.5 };
}

function getRotationHandleY(destination, rotationOffset, handleRadius) {
    const centerX = destination.x + destination.width / 2;
    const centerY = destination.y + destination.height / 2;
    const angle = destination.rotation * Math.PI / 180;
    for (const y of [
        -destination.height / 2 - rotationOffset,
        destination.height / 2 + rotationOffset,
    ]) {
        const x = centerX - y * Math.sin(angle);
        const canvasY = centerY + y * Math.cos(angle);
        if (x >= handleRadius && x <= targetCanvas.width - handleRadius &&
            canvasY >= handleRadius && canvasY <= targetCanvas.height - handleRadius) {
            return y;
        }
    }
    return -destination.height / 2 + Math.min(rotationOffset, destination.height / 2);
}

function updateTargetCursor(point) {
    if (selectedCrop < 0) {
        targetCanvas.style.cursor = 'default';
        return;
    }
    const destination = crops[selectedCrop].destination;
    const handle = hitTestHandle(point, destination);
    targetCanvas.style.cursor = handle === 'rotate'
        ? 'crosshair'
        : handle
            ? (handle.endsWith('tl') || handle.endsWith('br') ? 'nwse-resize' : 'nesw-resize')
            : hitTest(point) === selectedCrop ? 'grab' : 'default';
}

function normalizeRotation(rotation) {
    return (rotation % 360 + 360) % 360;
}

async function saveTemplate() {
    const name = nameInput.value.trim();
    const lengthMm = Number(lengthInput.value);
    if (!name) {
        status.textContent = 'Bitte gib der Vorlage einen Namen.';
        return;
    }
    if (!Number.isFinite(lengthMm) || lengthMm < 25 || lengthMm > 300) {
        status.textContent = 'Die Etikettenlänge muss zwischen 25 und 300 mm liegen.';
        return;
    }
    if (!crops.length) {
        status.textContent = 'Bitte füge mindestens einen Ausschnitt hinzu.';
        return;
    }

    const template = {
        id: existingTemplate?.id || createTemplateId(),
        name,
        lengthMm,
        crops,
    };
    try {
        await onSave(template);
        dialog.close();
    } catch (error) {
        status.textContent = error.message || 'Die Vorlage konnte nicht gespeichert werden.';
    }
}

function canvasPoint(canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - bounds.left) * canvas.width / bounds.width,
        y: (event.clientY - bounds.top) * canvas.height / bounds.height,
    };
}

function rectangle(start, end) {
    const x = clamp(Math.min(start.x, end.x), 0, sourceCanvas.width);
    const y = clamp(Math.min(start.y, end.y), 0, sourceCanvas.height);
    return {
        x,
        y,
        width: clamp(Math.max(start.x, end.x), 0, sourceCanvas.width) - x,
        height: clamp(Math.max(start.y, end.y), 0, sourceCanvas.height) - y,
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
