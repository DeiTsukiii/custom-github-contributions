(function(){
	const WEEKS = 53;
	const DAYS = 7;
	const grid = document.getElementById('grid');
	const clearBtn = document.getElementById('clearBtn');
	const exportBtn = document.getElementById('exportBtn');
	const timeInput = document.getElementById('timeInput');
	const monthLabels = document.getElementById('monthLabels');
	const emailInput = document.getElementById('emailInput');
	const yearInput = document.getElementById('yearInput');
	
	// === NOUVEAU ===
	const gitUrlInput = document.getElementById('gitUrlInput');
	
	const initialYear = new Date().getFullYear();
	yearInput.value = initialYear;
	
	let cells = [];

	function getGridStartSunday(year){
		const janFirst = new Date(year, 0, 1);
		const janFirstDay = janFirst.getDay();
		const startDate = new Date(janFirst);
		startDate.setDate(janFirst.getDate() - janFirstDay);
		startDate.setHours(0,0,0,0);
		return startDate;
	}

	function formatDateISO(d){
		const y = d.getFullYear();
		const m = String(d.getMonth()+1).padStart(2,'0');
		const day = String(d.getDate()).padStart(2,'0');
		return `${y}-${m}-${day}`;
	}

	function buildMonthLabels(year) {
		const startDate = getGridStartSunday(year);
		monthLabels.innerHTML = '';
		let lastMonth = -1;
		for (let c = 0; c < WEEKS; c++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + c * 7);
			const month = date.getMonth();
			const label = document.createElement('span');
			if (month !== lastMonth) {
				if (c > 0 || month === 0) {
					const monthName = date.toLocaleString('en', { month: 'short' });
					label.textContent = monthName;
				}
				lastMonth = month;
			}
			monthLabels.appendChild(label);
		}
	}

	function buildGrid(year) {
		grid.innerHTML = '';
		cells = [];
		const gridStartDate = getGridStartSunday(year);

		for(let c=0;c<WEEKS;c++){
			const col = document.createElement('div');
			col.className = 'col';
			grid.appendChild(col);
			cells[c]=[];
			for(let r=0;r<DAYS;r++){
				const cell = document.createElement('div');
				const cellDate = new Date(gridStartDate);
				cellDate.setDate(gridStartDate.getDate() + c*7 + r);
				
				if (cellDate.getFullYear() === year) {
					cell.className = 'cell intensity-0';
					cell.dataset.c = c;
					cell.dataset.r = r;
					cell.dataset.i = 0;
					cell.title = formatDateISO(cellDate);
					cell.addEventListener('click', ()=> {
						let i = (parseInt(cell.dataset.i)+1)%5;
						cell.dataset.i = i;
						cell.className = 'cell intensity-'+i;
						cells[c][r]=i;
					});
					cells[c][r]=0;
				} else {
					cell.className = 'cell disabled';
					cell.dataset.i = 0;
					cells[c][r]=0;
				}
				col.appendChild(cell);
			}
		}
		buildMonthLabels(year);
	}

	clearBtn.addEventListener('click', ()=>{
		for(let c=0;c<WEEKS;c++){
			for(let r=0;r<DAYS;r++){
				const el = grid.children[c].children[r];
				if (!el.classList.contains('disabled')) {
					cells[c][r]=0;
					el.dataset.i = 0;
					el.className = 'cell intensity-0';
				}
			}
		}
	});

	// === FONCTION D'EXPORT COMPLÈTEMENT MODIFIÉE ===
	exportBtn.addEventListener('click', ()=>{
		// 1. Récupérer toutes les valeurs
		const currentYear = parseInt(yearInput.value, 10);
		const exportStart = getGridStartSunday(currentYear);
		const map = [0, 1, 10, 20, 24]; // Votre map
		const time = timeInput.value || '12:00';
		const email = emailInput.value;
		const gitUrl = gitUrlInput.value; // Nouveau

		// 2. Validation
		if (!email || !email.includes('@')) {
			alert("Veuillez entrer une adresse email valide associée à votre compte GitHub.");
			return;
		}
		if (!gitUrl.startsWith('https://') || !gitUrl.endsWith('.git')) {
			alert("Veuillez entrer une URL de dépôt Git valide (ex: https://github.com/user/repo.git).");
			return;
		}
		
		// 3. Construction du script
		let lines = ['#!/bin/bash','set -e','echo "🚀 Initializing and setting up repository..."'];
		
		// Logique Git de base
		lines.push('git init');
		lines.push('git checkout -b main'); // Crée ou bascule sur la branche 'main'
		// Gère si le remote 'origin' existe déjà ou non
		lines.push(`git remote add origin "${gitUrl}" || git remote set-url origin "${gitUrl}"`);

		lines.push('');
		lines.push('echo "🎨 Creating commits..."');
		
		// Boucle de création des commits
		for(let c=0;c<WEEKS;c++){
			for(let r=0;r<DAYS;r++){
				const intensity = cells[c][r] || 0;
				const commits = map[intensity];
				if(commits<=0) continue;
				
				const date = new Date(exportStart);
				date.setDate(exportStart.getDate() + c*7 + r);
				
				if(date.getFullYear() !== currentYear) continue;

				const dateStr = formatDateISO(date);
				for(let k=0;k<commits;k++){
					const seconds = String(k).padStart(2,'0');
					const when = `${dateStr} ${time}:${seconds} +0000`;
					let cmd = `GIT_AUTHOR_EMAIL="${email}" GIT_COMMITTER_EMAIL="${email}" `;
					cmd += `GIT_AUTHOR_DATE="${when}" GIT_COMMITTER_DATE="${when}" `;
					cmd += `git commit --allow-empty -m "Contribution ${dateStr} ${k+1}"`;
					lines.push(cmd);
				}
			}
		}
		
		// Commandes finales de push
		lines.push('');
		lines.push('echo "⬆️ Pushing to GitHub (this will replace the remote history)..."');
		lines.push('git push --force origin main'); // Force push sur la branche main
		lines.push('');
		lines.push('echo "✅ All done!"');
		
		// 4. Téléchargement du blob
		const blob = new Blob([lines.join('\n')],{type:'application/x-sh'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'create_contributions.sh';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	});
	
	yearInput.addEventListener('change', () => {
		const newYear = parseInt(yearInput.value, 10);
		if (newYear && newYear > 1900 && newYear < 3000) {
			buildGrid(newYear);
		} else {
			yearInput.value = initialYear;
			buildGrid(initialYear);
		}
	});

	// APPEL INITIAL
	buildGrid(initialYear);

})();