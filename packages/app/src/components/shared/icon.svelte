<script module lang="ts">
	/*
	 * Teenyicons (https://icones.js.org/collection/teenyicons), inlined.
	 *
	 * Bodies are copied verbatim from @iconify-json/teenyicons, which is a
	 * devDependency used only by scripts/generate-icons.mjs — nothing ships it at
	 * runtime. Regenerate with `node scripts/generate-icons.mjs` after editing the
	 * MAP in that script.
	 *
	 * All icons are 15x15. Outline variants are STROKE-based
	 * (`fill="none" stroke="currentColor"`), so colour them with `text-*`, not
	 * `fill-*`; solid variants use `fill="currentColor"` and follow `text-*` too.
	 */
	let icons = {
		arrowDown: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m7.5 13.5l4-4m-4 4l-4-4m4 4V1"/>`
		},
		arrowLeft: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m1.5 7.5l4-4m-4 4l4 4m-4-4H14"/>`
		},
		arrowRight: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m13.5 7.5l-4-4m4 4l-4 4m4-4H1"/>`
		},
		arrowUp: {
			box: 15,
			svg: `<path fill="currentColor" d="m7.5 1.5l.354-.354L7.5.793l-.354.353zm-.354.354l4 4l.708-.708l-4-4zm0-.708l-4 4l.708.708l4-4zM7 1.5V14h1V1.5z"/>`
		},
		bin: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M4.5 3V1.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V3M0 3.5h15m-13.5 0v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-10M7.5 7v5m-3-3v3m6-3v3"/>`
		},
		bolt: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M11 11.5H4m7-3h-1m-2 0H7m-2 0H4m7-2h-1m-2 0H7m-2 0H4m3.5-2V0m6 4.5h-12a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1Z"/>`
		},
		calendarEdit: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M3.5 0v5m8-5v5m-10-2.5h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"/>`
		},
		caseSensitive: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M7.5 14V1.5M1.5 5V1.5h12V5m-10 8.5H11"/>`
		},
		check: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="m1 7l4.5 4.5L14 3"/>`
		},
		checkSquare: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M11 1.5h2.5v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-12H4m1 7l2 2l3.5-4m-6-6h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/>`
		},
		chevron: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="m5 14l7-6.5L5 1"/>`
		},
		chevronDown: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="m14 5l-6.5 7L1 5"/>`
		},
		chevronLeft: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="M10 14L3 7.5L10 1"/>`
		},
		chevronRight: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="m5 14l7-6.5L5 1"/>`
		},
		chevronUp: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="m1 10l6.5-7l6.5 7"/>`
		},
		cloudX: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m4.5 4.5l6 6m-6 0l6-6m-3 10a7 7 0 1 1 0-14a7 7 0 0 1 0 14Z"/>`
		},
		collapseCircle: {
			box: 15,
			svg: `<path fill="currentColor" d="M4.5 7H4v1h.5zm6 1h.5V7h-.5zm-6-4H4v1h.5zm2 1H7V4h-.5zm4-4.5l.354-.354L10.707 0H10.5zm3 3h.5v-.207l-.146-.147zM8 11l-.354.354zm-.5.5l.224.447l.04-.02l.036-.027zM4.5 8h6V7h-6zm0-3h2V4h-2zm8 9h-10v1h10zM2 13.5v-12H1v12zM2.5 1h8V0h-8zM13 3.5v10h1v-10zM10.146.854l3 3l.708-.708l-3-3zM2.5 14a.5.5 0 0 1-.5-.5H1A1.5 1.5 0 0 0 2.5 15zm10 1a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM2 1.5a.5.5 0 0 1 .5-.5V0A1.5 1.5 0 0 0 1 1.5zm3.474 10.158c.111-.333.427-.642.83-.75c.377-.101.862-.035 1.342.446l.708-.708c-.72-.72-1.569-.903-2.309-.704c-.713.192-1.297.733-1.52 1.4zm2.172-.304a1 1 0 0 1 .079.087l.79-.614a2 2 0 0 0-.161-.18zm.079.087c.078.1.06.132.063.11c.002-.014.006.009-.054.063a1 1 0 0 1-.29.169a1.8 1.8 0 0 1-.394.108a1 1 0 0 1-.25.01c-.017-.004.018 0 .07.037a.39.39 0 0 1 .131.43a.2.2 0 0 1-.023.047c-.002.002.015-.02.072-.067c.114-.092.324-.226.674-.4l-.448-.895q-.564.282-.854.517a1.4 1.4 0 0 0-.26.267a.7.7 0 0 0-.14.438a.61.61 0 0 0 .255.468c.113.084.238.12.33.139c.187.037.4.027.593-.002c.38-.058.872-.222 1.207-.526c.174-.159.339-.387.374-.686c.036-.306-.074-.593-.267-.84zm.075.459a2.6 2.6 0 0 1 .518-.307l-.397-.918q-.36.155-.721.425zm.518-.307c.65-.281 1.231-.133 1.826.15q.223.109.444.23c.144.078.296.161.44.235c.276.139.618.292.972.292v-1c-.094 0-.248-.047-.52-.184c-.128-.066-.262-.14-.416-.223c-.15-.081-.316-.17-.49-.252c-.698-.333-1.611-.616-2.653-.166z"/>`
		},
		copy: {
			box: 15,
			svg: `<path fill="currentColor" d="m10.5.5l.277-.416L10.651 0H10.5zm3 2h.5v-.268l-.223-.148zm-1 9.5h-8v1h8zM4 11.5v-10H3v10zM4.5 1h6V0h-6zM13 2.5v9h1v-9zM10.223.916l3 2l.554-.832l-3-2zM4.5 12a.5.5 0 0 1-.5-.5H3A1.5 1.5 0 0 0 4.5 13zm8 1a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM4 1.5a.5.5 0 0 1 .5-.5V0A1.5 1.5 0 0 0 3 1.5zm-3 2v10h1v-10zM2.5 15h8v-1h-8zm0-12h1V2h-1zM12 13.5v-1h-1v1zM10.5 15a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM1 13.5A1.5 1.5 0 0 0 2.5 15v-1a.5.5 0 0 1-.5-.5zm1-10a.5.5 0 0 1 .5-.5V2A1.5 1.5 0 0 0 1 3.5z"/>`
		},
		cursorI: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M7.5 14V1.5M1.5 5V1.5h12V5m-10 8.5H11"/>`
		},
		download: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m7.5 10.5l-3.25-3m3.25 3l3-3m-3 3V1m6 6v6.5h-12V7"/>`
		},
		editPencil: {
			box: 15,
			svg: `<path fill="currentColor" d="m.5 10.5l-.354-.354l-.146.147v.207zm10-10l.354-.354a.5.5 0 0 0-.708 0zm4 4l.354.354a.5.5 0 0 0 0-.708zm-10 10v.5h.207l.147-.146zm-4 0H0a.5.5 0 0 0 .5.5zm.354-3.646l10-10l-.708-.708l-10 10zm9.292-10l4 4l.708-.708l-4-4zm4 3.292l-10 10l.708.708l10-10zM4.5 14h-4v1h4zm-3.5.5v-4H0v4z"/>`
		},
		editPencilSolid: {
			box: 15,
			svg: `<path fill="currentColor" d="M10.854.146a.5.5 0 0 0-.708 0L0 10.293V14.5a.5.5 0 0 0 .5.5h4.207L14.854 4.854a.5.5 0 0 0 0-.708z"/>`
		},
		expandCircle: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M13.5 13.5H10m3.5 0V10m0 3.5l-4-4m.5-8h3.5m0 0V5m0-3.5l-4 4M5 1.5H1.5m0 0V5m0-3.5l4 4m-4 4.5v3.5m0 0H5m-3.5 0l4-4"/>`
		},
		eye: {
			box: 15,
			svg: `<path fill="currentColor" d="m.5 7.5l-.464-.186a.5.5 0 0 0 0 .372zm14 0l.464.186a.5.5 0 0 0 0-.372zm-7 4.5c-2.314 0-3.939-1.152-5.003-2.334a9.4 9.4 0 0 1-1.449-2.164l-.08-.18l-.004-.007v-.001L.5 7.5l-.464.186v.002l.003.004l.026.063l.078.173a10.4 10.4 0 0 0 1.61 2.406C2.94 11.653 4.814 13 7.5 13zm-7-4.5l.464.186l.004-.008a3 3 0 0 1 .08-.18a9.4 9.4 0 0 1 1.449-2.164C3.56 4.152 5.186 3 7.5 3V2C4.814 2 2.939 3.348 1.753 4.666a10.4 10.4 0 0 0-1.61 2.406a6 6 0 0 0-.104.236l-.002.004v.001H.035zm7-4.5c2.314 0 3.939 1.152 5.003 2.334a9.4 9.4 0 0 1 1.449 2.164l.08.18l.004.007v.001L14.5 7.5l.464-.186v-.002l-.003-.004l-.026-.063l-.078-.173a10.4 10.4 0 0 0-1.61-2.406C12.06 3.348 10.186 2 7.5 2zm7 4.5l-.464-.186l-.003.008l-.015.035l-.066.145a9.4 9.4 0 0 1-1.449 2.164C11.44 10.848 9.814 12 7.5 12v1c2.686 0 4.561-1.348 5.747-2.665a10.4 10.4 0 0 0 1.61-2.407a6 6 0 0 0 .104-.236l.002-.004v-.001h.001zM7.5 9A1.5 1.5 0 0 1 6 7.5H5A2.5 2.5 0 0 0 7.5 10zM9 7.5A1.5 1.5 0 0 1 7.5 9v1A2.5 2.5 0 0 0 10 7.5zM7.5 6A1.5 1.5 0 0 1 9 7.5h1A2.5 2.5 0 0 0 7.5 5zm0-1A2.5 2.5 0 0 0 5 7.5h1A1.5 1.5 0 0 1 7.5 6z"/>`
		},
		floppy: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M4.5 14.5v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m3 0h-12a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1h8.586a1 1 0 0 1 .707.293l3.414 3.414a1 1 0 0 1 .293.707V13.5a1 1 0 0 1-1 1Z"/>`
		},
		folder: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M.5 12.5v-10a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1Z"/>`
		},
		folderOpen: {
			box: 15,
			svg: `<path fill="currentColor" d="M1.5 1A1.5 1.5 0 0 0 0 2.5v10A1.5 1.5 0 0 0 1.5 14h12a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 13.5 3H7.707l-2-2z"/>`
		},
		folderPlus: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M7.5 6v5M5 8.5h5m-9.5-6v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6l-2-2h-4a1 1 0 0 0-1 1Z"/>`
		},
		glasses: {
			box: 15,
			svg: `<path fill="currentColor" d="M7.5 9C5.186 9 3.561 7.848 2.497 6.666a9.4 9.4 0 0 1-1.449-2.164l-.08-.18l-.004-.007v-.001L.5 4.5l-.464.186v.002l.003.004l.026.063l.078.173a10.4 10.4 0 0 0 1.61 2.406C2.94 8.652 4.814 10 7.5 10zm7-4.5l-.464-.186l-.003.008l-.015.035l-.066.145a9.4 9.4 0 0 1-1.449 2.164C11.44 7.848 9.814 9 7.5 9v1c2.686 0 4.561-1.348 5.747-2.666a10.4 10.4 0 0 0 1.61-2.406a6 6 0 0 0 .104-.236l.002-.004v-.001h.001zM8 12V9.5H7V12zm-6.646-1.646l2-2l-.708-.708l-2 2zm10.292-2l2 2l.708-.708l-2-2z"/>`
		},
		identityGhost: {
			box: 15,
			svg: `<path fill="currentColor" d="m3.914 14.086l.354.353zM4 14l-.354-.354zm2.5 0l.354-.354zm.146.146l-.353.354zm1.708 0L8 13.793zM8.5 14l.354.354zm2.5 0l-.354.354zm.086.086l-.354.353zM5 6h1V5H5zm4 0h1V5H9zm1.1 1.7a3.25 3.25 0 0 1-5.2 0l-.8.6c1.7 2.267 5.1 2.267 6.8 0zm-5.832 6.74l.086-.086l-.708-.708l-.085.086zm.94-.44h.085v-1h-.086zm.938.354l.147.146l.707-.707l-.146-.147zm2.561.146l.147-.146l-.708-.708l-.146.147zm1-.5h.086v-1h-.086zm.94.354l.085.085l.707-.707l-.085-.086zm1.439.646A1.914 1.914 0 0 0 14 13.086h-1c0 .505-.41.914-.914.914zm-1.354-.56c.36.358.846.56 1.354.56v-1a.9.9 0 0 1-.647-.268zm-.94-.44c.321 0 .628.127.854.354l.708-.708A2.2 2.2 0 0 0 9.793 13zm-.938.354c.226-.227.533-.354.853-.354v-1c-.585 0-1.147.232-1.56.646zM7.5 15c.453 0 .887-.18 1.207-.5L8 13.793a.7.7 0 0 1-.5.207zm-1.207-.5c.32.32.754.5 1.207.5v-1a.7.7 0 0 1-.5-.207zm-1-.5c.32 0 .627.127.853.354l.708-.708A2.2 2.2 0 0 0 5.293 13zm-.94.354c.227-.227.534-.354.854-.354v-1c-.585 0-1.147.232-1.56.646zM2.915 15c.508 0 .995-.202 1.354-.56l-.707-.708a.9.9 0 0 1-.647.268zM1 13.086C1 14.143 1.857 15 2.914 15v-1A.914.914 0 0 1 2 13.086zM7.5 1A5.5 5.5 0 0 1 13 6.5h1A6.5 6.5 0 0 0 7.5 0zM2 6.5A5.5 5.5 0 0 1 7.5 1V0A6.5 6.5 0 0 0 1 6.5zm-1 0v6.586h1V6.5zm13 6.586V6.5h-1v6.586z"/>`
		},
		inboxFull: {
			box: 15,
			svg: `<path fill="currentColor" d="m7.713 11.493l-.035-.5zM1.5 1h12V0h-12zm12.5.5v12h1v-12zM13.5 14h-12v1h12zM1 13.5v-12H0v12zm.5.5a.5.5 0 0 1-.5-.5H0A1.5 1.5 0 0 0 1.5 15zm12.5-.5a.5.5 0 0 1-.5.5v1a1.5 1.5 0 0 0 1.5-1.5zM13.5 1a.5.5 0 0 1 .5.5h1A1.5 1.5 0 0 0 13.5 0zm-12-1A1.5 1.5 0 0 0 0 1.5h1a.5.5 0 0 1 .5-.5zm6 12q.125 0 .248-.009l-.07-.997A3 3 0 0 1 7.5 11zm-.823-.098Q7.074 12 7.5 12v-1q-.305 0-.589-.07zm.234-.972c-.969-.233-1.9-.895-2.97-1.586C2.924 8.687 1.771 8 .5 8v1c.938 0 1.858.512 2.899 1.184c.987.638 2.099 1.434 3.278 1.719zm.837 1.061c1.386-.097 2.7-.927 3.865-1.632C12.843 9.616 13.922 9 15 9V8c-1.407 0-2.732.794-3.905 1.503c-1.237.749-2.324 1.414-3.417 1.49z"/>`
		},
		layer: {
			box: 15,
			svg: `<path fill="currentColor" d="m7.5 1.5l.197-.46a.5.5 0 0 0-.394 0zm-7 3l-.197-.46a.5.5 0 0 0 0 .92zm7 3l-.197.46a.5.5 0 0 0 .394 0zm7-3l.197.46a.5.5 0 0 0 0-.92zm-7 6l-.197.46l.197.084l.197-.084zm0 3l-.197.46l.197.084l.197-.084zM7.303 1.04l-7 3l.394.92l7-3zm-7 3.92l7 3l.394-.92l-7-3zm7.394 3l7-3l-.394-.92l-7 3zm7-3.92l-7-3l-.394.92l7 3zM.303 7.96l7 3l.394-.92l-7-3zm7.394 3l7-3l-.394-.92l-7 3zm-7.394 0l7 3l.394-.92l-7-3zm7.394 3l7-3l-.394-.92l-7 3z"/>`
		},
		lifebouy: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M10.329 10.328a4 4 0 0 1-5.657 0m5.657 0a4 4 0 0 0 0-5.656m0 5.656l2.12 2.122m-7.777-2.122a4 4 0 0 1 0-5.656m0 5.656L2.55 12.45m7.779-7.778a4 4 0 0 0-5.657 0m5.657 0l2.12-2.122M4.673 4.672L2.55 2.55m9.9 9.9a7 7 0 0 1-9.9 0m9.9 0a7 7 0 0 0 0-9.9m-9.9 9.9a7 7 0 0 1 0-9.9m9.9 0a7 7 0 0 0-9.9 0"/>`
		},
		loader: {
			box: 15,
			svg: `<path fill="currentColor" d="M8 1V.5H7V1zM7 4.5V5h1v-.5zm1 6V10H7v.5zM7 14v.5h1V14zM4.5 7.995H5v-1h-.5zm-3.5-1H.5v1H1zM14 8h.5V7H14zm-3.5-1.005H10v1h.5zM7 1v3.5h1V1zm0 9.5V14h1v-3.5zM4.5 6.995H1v1h3.5zM14 7l-3.5-.005v1L14 8zM2.147 2.854l3 3l.708-.708l-3-3zm10-.708l-3 3l.708.708l3-3zM2.854 12.854l3-3l-.708-.708l-3 3zm6.292-3l3 3l.708-.708l-3-3z"/>`
		},
		monitor: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M9.5 14.5h4a1 1 0 0 0 1-1v-12a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm0 0H4m2.5-3v3m2-9h6m-4.5 6h3m-11.5-8h7v8h-7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"/>`
		},
		moon: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linejoin="round" d="M1.66 11.362q.65.136 1.34.138A6.5 6.5 0 0 0 7.693.503A7 7 0 1 1 1.66 11.362Z"/>`
		},
		motionCirclesLines: {
			box: 15,
			svg: `<path fill="currentColor" d="m14.5.5l.46.197a.5.5 0 0 0-.657-.657zm-14 6l-.197-.46a.5.5 0 0 0-.06.889zm8 8l-.429.257a.5.5 0 0 0 .889-.06zM14.303.04l-14 6l.394.92l14-6zM.243 6.93l5 3l.514-.858l-5-3zM5.07 9.757l3 5l.858-.514l-3-5zm3.889 4.94l6-14l-.92-.394l-6 14zM14.146.147l-9 9l.708.707l9-9z"/>`
		},
		note: {
			box: 15,
			svg: `<path fill="currentColor" d="m10.5.5l.354-.354L10.707 0H10.5zm3 3h.5v-.207l-.146-.147zm-1 10.5h-10v1h10zM2 13.5v-12H1v12zM2.5 1h8V0h-8zM13 3.5v10h1v-10zM10.146.854l3 3l.708-.708l-3-3zM2.5 14a.5.5 0 0 1-.5-.5H1A1.5 1.5 0 0 0 2.5 15zm10 1a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM2 1.5a.5.5 0 0 1 .5-.5V0A1.5 1.5 0 0 0 1 1.5z"/>`
		},
		notePlus: {
			box: 15,
			svg: `<path fill="currentColor" d="m10.5.5l.354-.354L10.707 0H10.5zm3 3h.5v-.207l-.146-.147zm-1 10.5h-10v1h10zM2 13.5v-12H1v12zM2.5 1h8V0h-8zM13 3.5v10h1v-10zM10.146.854l3 3l.708-.708l-3-3zM2.5 14a.5.5 0 0 1-.5-.5H1A1.5 1.5 0 0 0 2.5 15zm10 1a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM2 1.5a.5.5 0 0 1 .5-.5V0A1.5 1.5 0 0 0 1 1.5zM7 5v5h1V5zM5 8h5V7H5z"/>`
		},
		opactiySolid: {
			box: 15,
			svg: `<path fill="currentColor" d="M9 0H6v2H0v1h6v2h3V3h6V2H9zM5 5H2v2H0v1h2v2h3V8h10V7H5zm8 5h-3v2H0v1h10v2h3v-2h2v-1h-2z"/>`
		},
		phoneOff: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M6 11.5h3m-5.5 3h8a1 1 0 0 0 1-1v-12a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>`
		},
		replace: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M7.5 14.5A7 7 0 0 1 3.17 2M7.5.5A7 7 0 0 1 11.83 13m-.33-3v3.5H15M0 1.5h3.5V5"/>`
		},
		replaceAll: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M.5 7.5A7 7 0 0 1 13 3.17m1.5 4.33A7 7 0 0 1 2 11.83m3-.33H1.5V15m12-15v3.5H10"/>`
		},
		safe: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M2.5 3v3m0 2v3m0 2.5V15m10-1.5V15m-3-5.5a2 2 0 1 1 0-4a2 2 0 0 1 0 4Zm-8-9h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"/>`
		},
		search: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m14.5 14.5l-4-4m-4 2a6 6 0 1 1 0-12a6 6 0 0 1 0 12Z"/>`
		},
		searchBars: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m14.5 14.5l-4-4m-4 2a6 6 0 1 1 0-12a6 6 0 0 1 0 12Z"/>`
		},
		searchDocument: {
			box: 15,
			svg: `<path fill="currentColor" d="M4.5 8.5H4a.5.5 0 0 0 .5.5zm4 0V9a.5.5 0 0 0 .5-.5zm0-2.5H9a.5.5 0 0 0-.146-.354zm-2-2l.354-.354a.5.5 0 0 0-.708 0zm-2 2l-.354-.354A.5.5 0 0 0 4 6zm10.354 8.146l-4-4l-.708.708l4 4zM6.5 12A5.5 5.5 0 0 1 1 6.5H0A6.5 6.5 0 0 0 6.5 13zM12 6.5A5.5 5.5 0 0 1 6.5 12v1A6.5 6.5 0 0 0 13 6.5zM6.5 1A5.5 5.5 0 0 1 12 6.5h1A6.5 6.5 0 0 0 6.5 0zm0-1A6.5 6.5 0 0 0 0 6.5h1A5.5 5.5 0 0 1 6.5 1zm-2 9h4V8h-4zM9 8.5V6H8v2.5zm-.146-2.854l-2-2l-.708.708l2 2zm-2.708-2l-2 2l.708.708l2-2zM4 6v2.5h1V6z"/>`
		},
		settings: {
			box: 15,
			svg: `<g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" clip-rule="evenodd"><path d="m5.944.5l-.086.437l-.329 1.598a5.5 5.5 0 0 0-1.434.823L2.487 2.82l-.432-.133l-.224.385L.724 4.923L.5 5.31l.328.287l1.244 1.058c-.045.277-.103.55-.103.841s.058.565.103.842L.828 9.395L.5 9.682l.224.386l1.107 1.85l.224.387l.432-.135l1.608-.537c.431.338.908.622 1.434.823l.329 1.598l.086.437h3.111l.087-.437l.328-1.598a5.5 5.5 0 0 0 1.434-.823l1.608.537l.432.135l.225-.386l1.106-1.851l.225-.386l-.329-.287l-1.244-1.058c.046-.277.103-.55.103-.842c0-.29-.057-.564-.103-.841l1.244-1.058l.329-.287l-.225-.386l-1.106-1.85l-.225-.386l-.432.134l-1.608.537a5.5 5.5 0 0 0-1.434-.823L9.142.937L9.055.5z"/><path d="M9.5 7.495a2 2 0 0 1-4 0a2 2 0 0 1 4 0Z"/></g>`
		},
		settingsSolid: {
			box: 15,
			svg: `<path fill="currentColor" d="M6.026 7.5c0-.827.66-1.5 1.473-1.5s1.473.673 1.473 1.5S8.312 9 7.499 9s-1.473-.673-1.473-1.5"/><path fill="currentColor" fill-rule="evenodd" d="M5.568 0h3.86l.164.837V.84l.27 1.335c.383.172.74.386 1.068.627l1.345-.458l.796-.251l.417.727l1.087 1.854l.425.743l-.633.563l-1.009.874c.032.197.061.418.061.646s-.03.45-.06.646l1.012.878l.629.559l-.428.748l-1.084 1.849l-.417.73l-.807-.258l-1.334-.454a6 6 0 0 1-1.068.627l-.27 1.335v.003L9.43 15H5.57l-.163-.839l-.27-1.336a6 6 0 0 1-1.068-.627l-1.343.457l-.799.255l-.415-.73l-1.088-1.855L0 9.583l.632-.563l1.008-.875a4 4 0 0 1-.06-.645c0-.227.03-.45.061-.645l-1.014-.88L0 5.418l.426-.748l1.085-1.85l.415-.728l.808.256l1.334.454a6 6 0 0 1 1.068-.627l.27-1.337zM7.5 5C6.144 5 5.045 6.12 5.045 7.5s1.1 2.5 2.454 2.5s2.454-1.12 2.454-2.5S8.853 5 7.5 5" clip-rule="evenodd"/>`
		},
		sidebarArrow: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="M10 14L3 7.5L10 1"/>`
		},
		sidebarMenuLeft: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M9.5 0v15m4-15v15m-8-15v15m-4-15v15"/>`
		},
		sidebarMenuRight: {
			box: 15,
			svg: `<path fill="currentColor" d="M7 1.5V2h1v-.5zm1-.01v-.5H7v.5zM8 13.5V4H7v9.5zm0-12v-.01H7v.01zM4 5h3.5V4H4zm-2 9h11v-1H2z"/>`
		},
		sun: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" stroke-linecap="square" d="M7.5 1.5v-1m0 13.99v-.998m6-5.997h1m-13 0h-1m2-4.996l-1-1m12 0l-1 1m-10 9.993l-1 1m12 0l-1-1m-2-4.997a3 3 0 0 1-3 2.998a2.999 2.999 0 1 1 3-2.998Z"/>`
		},
		undoCircle: {
			box: 15,
			svg: `<path fill="currentColor" d="m6.5 2.499l-.354-.354l-.353.354l.353.353zm1-.5H7v1h.5zM2 8.495v-.5H1v.5zM8.145.146l-1.999 2l.708.706L8.853.854zM6.146 2.852l2 1.999l.707-.707l-2-1.999zM7.5 3C10.537 3 13 5.461 13 8.496h1A6.5 6.5 0 0 0 7.5 2zM13 8.495a5.5 5.5 0 0 1-5.5 5.496v1c3.589 0 6.5-2.909 6.5-6.496zM7.5 13.99A5.5 5.5 0 0 1 2 8.495H1a6.5 6.5 0 0 0 6.5 6.496z"/>`
		},
		wholeWord: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="M13 1.5H6.5a4 4 0 1 0 0 8h1m3 4.5V1.5M7.5 14V1.5"/>`
		},
		x: {
			box: 15,
			svg: `<path fill="none" stroke="currentColor" d="m1.5 1.5l12 12m-12 0l12-12"/>`
		}
	};

	export type IconKey = keyof typeof icons;
</script>

<script lang="ts">
	interface Props {
		name: IconKey;
		[key: string]: any;
	}

	let { name, ...props }: Props = $props();
	let displayIcon = $derived(icons[name]);
</script>

<svg
	class={props.class}
	width="1em"
	height="1em"
	viewBox="0 0 {displayIcon.box} {displayIcon.box}"
	{...props}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html displayIcon.svg}
</svg>
