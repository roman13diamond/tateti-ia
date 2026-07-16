# Ta-Te-Ti IA — Electron Desktop

## Cómo funciona

El exe intenta cargar el juego desde Vercel (internet, versión siempre actualizada).  
Si no hay internet, carga los archivos locales empaquetados dentro del exe (versión al momento del build).

---

## Parte 1 — Publicar en Vercel (gratis, una sola vez)

### 1. Crear cuenta en Vercel
→ https://vercel.com (podés entrar con tu cuenta de GitHub)

### 2. Subir el proyecto a GitHub
El proyecto tiene que estar en un repositorio de GitHub para que Vercel lo tome automáticamente.  
Si todavía no lo tenés en GitHub, creá un repo y subí el código.

### 3. Importar en Vercel
- Entrá a https://vercel.com/new
- Elegí tu repositorio de GitHub
- Vercel va a detectar el `vercel.json` automáticamente
- Hacé clic en **Deploy**

### 4. Obtener tu URL de Vercel
Después del deploy te queda una URL del tipo:
```
https://tateti-ia.vercel.app
```
(o la que Vercel te asigne)

### 5. Poner la URL en el exe
Editá `artifacts/electron-app/main.js`, línea 9:
```js
const VERCEL_URL = "https://tateti-ia.vercel.app"; // ← tu URL real
```

---

## Parte 2 — Crear el .exe (una sola vez después de configurar Vercel)

### Requisitos en Windows
- **Node.js LTS** → https://nodejs.org
- **pnpm** → en PowerShell: `npm install -g pnpm`

### Comandos
```powershell
# En la raíz del proyecto descargado de Replit
pnpm install
cd artifacts\electron-app
pnpm run build
```

### Resultado
```
artifacts\electron-app\dist-exe\TaTeTi-IA-Portable.exe
```

---

## Cómo actualizar el juego después

1. Hacés los cambios acá en Replit
2. Subís (`git push`) al mismo repo de GitHub
3. Vercel detecta el push y hace el deploy automáticamente (~1 minuto)
4. El exe toma los cambios al abrirse — sin tocar nada más

---

## Menú del exe

Dentro del exe, el menú **Juego** tiene:
- **F5** — recargar
- **Cargar versión online** — fuerza la URL de Vercel
- **Cargar versión local** — usa los archivos del exe (offline)

---

## Nota sobre SmartScreen

Windows puede mostrar "Windows protegió tu PC" la primera vez.  
Clic en **"Más información" → "Ejecutar de todas formas"**.
