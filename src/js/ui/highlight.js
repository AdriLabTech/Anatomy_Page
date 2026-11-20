// Marca sobre la lámina la parte que hay que identificar.
// (x, y) en data.json es el CENTRO del recuadro, en píxeles de la imagen original.
// Se dibuja el recuadro rojo en el canvas y, encima, un marcador con pulso y foco
// (atenúa el resto de la lámina) recortado a los bordes de la imagen.

export function drawHighlight(img, canvas, part, { clip, marker } = {}) {
    if (!img.complete || img.naturalWidth === 0) return;

    const scaleX = img.width / img.naturalWidth;
    const scaleY = img.height / img.naturalHeight;

    const width = part.width * scaleX;
    const height = part.height * scaleY;
    const x = part.x * scaleX - width / 2;
    const y = part.y * scaleY - height / 2;

    // El canvas (y el recorte del marcador) se colocan exactamente encima de la imagen
    // offsetLeft/offsetTop ignoran las transformaciones (la animación de entrada escala la imagen)
    const left = `${img.offsetLeft}px`;
    const top = `${img.offsetTop}px`;

    canvas.width = img.width;
    canvas.height = img.height;
    Object.assign(canvas.style, { width: `${img.width}px`, height: `${img.height}px`, position: 'absolute', left, top });

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    if (clip && marker) {
        Object.assign(clip.style, { width: `${img.width}px`, height: `${img.height}px`, left, top });
        Object.assign(marker.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
        clip.classList.add('on');
    }
}
