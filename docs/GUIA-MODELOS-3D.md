# Guía para incorporar modelos 3D reales

Esta guía describe cómo añadir modelos reales a la carta. No utilices fotografías como sustitutos de modelos 3D.

## Captura

1. Crea un plato limpio y fijo sobre una mesa con luz difusa.
2. Captura al menos una vuelta completa alrededor del plato desde varias alturas.
3. Usa una aplicación compatible como RealityScan o Polycam y sigue su escaneado fotogramétrico.
4. Revisa huecos, reflejos y bordes antes de exportar.

## Exportación

- Exporta el modelo en GLB para el visor web.
- Exporta en USDZ cuando el flujo permita compatibilidad con Quick Look en iOS.
- Incluye texturas en formatos comprimidos y conserva una resolución suficiente sin archivos excesivos.
- Guarda los archivos en `assets/modelos/` y los archivos USDZ en `assets/modelos/usdz/`.

## Datos del plato

Completa en `data/menu.json`, únicamente cuando estén disponibles y verificados:

- `image`: fotografía real del plato.
- `glb`: ruta al modelo GLB.
- `usdz`: ruta al modelo USDZ.
- `ingredients`: ingredientes confirmados por el restaurante.
- `allergens`: alérgenos confirmados por el restaurante.

No publiques un modelo hasta comprobar su peso, su licencia y su representación visual real.
