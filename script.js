const MID = "23b81a05hw";
const MPASS = "shankari";

let candidates = JSON.parse(localStorage.getItem('ext_candidates')) || {
    "Panvi": { votes: 0, image: "https://munsifdaily.com/wp-content/uploads/2024/12/BRS-1.jpg" },
    "Charan": { votes: 0, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Logo_of_the_Bharatiya_Janata_Party.svg/1280px-Logo_of_the_Bharatiya_Janata_Party.svg.png" }
};
let voters = JSON.parse(localStorage.getItem('ext_voters')) || [];
let showResultsToVoters = JSON.parse(localStorage.getItem('showResults')) || false;
let backgrounds = JSON.parse(localStorage.getItem('ext_bgs')) || { login: "", voter: "", manager: "", result: "" };
let activeVoter = null;

window.onload = () => applyBG('login');

// --- FIXED LOGIN LOGIC ---
function handleLogin() {
    const idInput = document.getElementById('loginID').value.trim(); 
    const passInput = document.getElementById('loginPass').value.trim(); 

    if (idInput === MID && passInput === MPASS) {
        applyBG('manager');
        loadManager();
    } else {
        const v = voters.find(u => u.id === idInput && u.pass === passInput);
        if (v) {
            activeVoter = v;
            showResultsToVoters ? applyBG('result') : applyBG('voter');
            loadVoter();
        } else {
            alert(`Invalid Credentials!\nNote: IDs are case-sensitive.`);
        }
    }
}

function handleExcelUpload() {
    const file = document.getElementById('excelFile').files[0];
    if (!file) return alert("Select file!");
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        jsonData.forEach(row => {
            let contact = "", id = "", pass = "";
            for (let key in row) {
                let k = key.toLowerCase().trim();
                if (k.includes("mail") || k.includes("contact") || k.includes("wa")) contact = String(row[key]).trim();
                if (k === "id" || k.includes("ids")) id = String(row[key]).trim();
                if (k.includes("pass") || k.includes("dob")) pass = String(row[key]).trim();
            }
            if (id && pass && contact && !voters.find(v => v.id == id)) {
                voters.push({ id, pass, contact, hasVoted: false, sent: false });
            }
        });
        saveData(); renderVoterQueue();
        alert("Processed!");
    };
    reader.readAsArrayBuffer(file);
}

function renderVoterQueue() {
    const queue = document.getElementById('voterQueue');
    if (voters.length === 0) { queue.innerHTML = "Empty"; return; }
    queue.innerHTML = voters.map((v, index) => `
        <div class="queue-item" style="border-left: 5px solid ${v.sent ? '#059669' : '#dc2626'}; padding-left:10px;">
            <div><strong>${v.contact}</strong><br><small>ID: ${v.id} | Pass: ${v.pass}</small></div>
            <button onclick="sendMail(${index})" style="background:#ea4335; width:auto; padding:4px 10px; font-size:10px;">Send</button>
        </div>
    `).join('');
}

function sendMail(index) {
    const v = voters[index];
    const url = window.location.href;
    const msg = encodeURIComponent(`Portal: ${url}\nID: ${v.id}\nPass: ${v.pass}`);
    v.sent = true; saveData(); renderVoterQueue();
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${v.contact}&su=Vote+Access&body=${msg}`, '_blank');
}

function bulkGmailBCC() {
    const emails = voters.map(v => v.contact).join(',');
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&bcc=${emails}&su=Election+Started&body=Link:+${window.location.href}`, '_blank');
}

function addNewCandidate() {
    const name = document.getElementById('newCandName').value.trim();
    if (name) { candidates[name] = { votes: 0, image: "" }; document.getElementById('newCandName').value = ""; saveData(); loadManager(); }
}

function renameCandidate(old) {
    const n = prompt("New name:", old);
    if (n && n !== old) { candidates[n] = candidates[old]; delete candidates[old]; saveData(); loadManager(); }
}

function changePhoto(name, event) {
    const reader = new FileReader();
    reader.onload = (e) => { candidates[name].image = e.target.result; saveData(); loadManager(); };
    reader.readAsDataURL(event.target.files[0]);
}

function deleteCandidate(name) {
    if(confirm("Remove?")) { delete candidates[name]; saveData(); loadManager(); }
}

function applyBG(page) {
    if (backgrounds[page]) document.body.style.backgroundImage = `url('${backgrounds[page]}')`;
    else document.body.style.backgroundColor = "#cbd5e1";
}

function uploadBG(page, event) {
    const reader = new FileReader();
    reader.onload = (e) => { backgrounds[page] = e.target.result; localStorage.setItem('ext_bgs', JSON.stringify(backgrounds)); applyBG(page); };
    reader.readAsDataURL(event.target.files[0]);
}

function toggleResultsVisibility() {
    showResultsToVoters = !showResultsToVoters;
    localStorage.setItem('showResults', JSON.stringify(showResultsToVoters));
    updateToggleBtn();
}

function updateToggleBtn() {
    const btn = document.getElementById('toggleResultsBtn');
    if(!btn) return;
    btn.innerText = `End Election & Show Results: ${showResultsToVoters ? 'ON' : 'OFF'}`;
    btn.className = showResultsToVoters ? "btn-toggle active" : "btn-toggle";
}

function loadManager() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('managerDash').classList.remove('hidden');
    updateToggleBtn(); renderVoterQueue();
    const list = document.getElementById('managerResults');
    list.innerHTML = Object.keys(candidates).map(name => `
        <div class="card">
            <div class="symbol-frame"><img src="${candidates[name].image || ''}"></div>
            <div style="flex-grow:1">
                <b>${name}</b><br>
                <button onclick="renameCandidate('${name}')" style="font-size:8px; width:auto; padding:2px; background:#eee; color:black;">Name</button>
                <button onclick="document.getElementById('editImg_${name}').click()" style="font-size:8px; width:auto; padding:2px; background:#eee; color:black;">Photo</button>
                <button onclick="deleteCandidate('${name}')" style="font-size:8px; width:auto; padding:2px; background:#fee2e2; color:red;">X</button>
                <input type="file" id="editImg_${name}" class="hidden" onchange="changePhoto('${name}', event)">
            </div>
            <div style="font-weight:bold">${candidates[name].votes} Votes</div>
        </div>
    `).join('');
}

function loadVoter() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('voterDash').classList.remove('hidden');
    updateVoterUI();
}

function updateVoterUI() {
    const box = document.getElementById('voterBallot');
    const resView = document.getElementById('voterResultsView');
    box.innerHTML = "";
    if (showResultsToVoters) {
        document.getElementById('vH').innerText = "Election Closed";
        resView.classList.remove('hidden');
        document.getElementById('vResults').innerHTML = Object.keys(candidates).map(n => 
            `<div style="display:flex; justify-content:space-between; padding:5px 0;"><b>${n}</b> <span>${candidates[n].votes}</span></div>`).join("");
        return;
    }
    if (activeVoter.hasVoted) {
        document.getElementById('vH').innerText = "Vote Verified ✅";
        box.innerHTML = "<p style='text-align:center;'>Recorded.</p>";
    } else {
        Object.keys(candidates).forEach(name => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<div class="symbol-frame"><img src="${candidates[name].image || ''}"></div><div style="flex-grow:1"><b>${name}</b></div><button onclick="castVote('${name}')" style="background:var(--primary); width:auto; padding:8px 20px;">Vote</button>`;
            box.appendChild(card);
        });
    }
}

function castVote(name) {
    if (confirm(`Vote for ${name}?`)) {
        candidates[name].votes++;
        activeVoter.hasVoted = true;
        const vIdx = voters.findIndex(v => v.id == activeVoter.id);
        if(vIdx !== -1) voters[vIdx].hasVoted = true;
        saveData(); updateVoterUI();
    }
}

function saveData() {
    localStorage.setItem('ext_candidates', JSON.stringify(candidates));
    localStorage.setItem('ext_voters', JSON.stringify(voters));
}

function clearVoters() {
    if(confirm("Clear list?")) { voters = []; saveData(); renderVoterQueue(); }
}
