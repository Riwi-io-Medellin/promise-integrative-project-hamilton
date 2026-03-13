export async function candidatosView() {
	const resp = await fetch('/src/views/candidatosView.html');
	const template = await resp.text();
	return {
		title: 'Gestión de Candidatos',
		cssPath: 'src/css/candidatos.css',
		template,
		logic: async () => {
			const mod = await import('../logic/candidatos.js');
			if (mod && typeof mod.initCandidatosView === 'function') mod.initCandidatosView();
		}
	};
}