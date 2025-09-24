const API_URL = "https://nounou-app-production.up.railway.app"

async function ajouterEntree() {
    let date = document.getElementById("date").value;
    let heure_debut = document.getElementById("heure_debut").value;
    let heure_fin = document.getElementById("heure_fin").value;
    let km = document.getElementById("km").value;
    let messageDiv = document.getElementById("saisie-message");
    let addBtn = document.querySelector("#saisie button[onclick='ajouterEntree()']");
    messageDiv.textContent = "";
    messageDiv.style.color = "red";

    // Si le bouton est en mode "Ajouter"
    if (addBtn.textContent === "Ajouter") {
        if (date && heure_debut && heure_fin && km) {
            const dateFR = formatDateFR(date);
            messageDiv.style.color = "#39FF14";
            messageDiv.innerHTML = `
                <strong>Récapitulatif :</strong><br>
                Date : ${dateFR}<br>
                Heure début : ${heure_debut}<br>
                Heure fin : ${heure_fin}<br>
                KM parcourus : ${km}
            `;
            addBtn.textContent = "Valider";
        } else {
            messageDiv.textContent = "Veuillez remplir tous les champs";
        }
    }
    // Si le bouton est en mode "Valider"
    else if (addBtn.textContent === "Valider") {
        const response = await fetch(`${API_URL}/ajouter`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({date, heure_debut, heure_fin, km})
        });
        if (response.ok) {
            messageDiv.style.color = "#39FF14";
            // messageDiv.innerHTML = "Informations enregistrées avec succès !";
            addBtn.textContent = "Ajouter";
            // Réinitialise les champs
            document.getElementById("date").value = "";
            document.getElementById("heure_debut").value = "";
            document.getElementById("heure_fin").value = "";
            document.getElementById("km").value = "";
            messageDiv.textContent = "";
            // Revient sur la page navigation
            showPage('navigation');
            chargerDonnees();
        } else {
            messageDiv.style.color = "red";
            messageDiv.textContent = "Erreur lors de l'enregistrement...";
        }
    }
}

async function chargerDonnees() {
    //console.log("chargerDonnees dans script.js");
    let response = await fetch(`${API_URL}/donnees`);
    let data = await response.json();

    // Vérification : data doit être un tableau
    if (!Array.isArray(data)) {
        //console.error("Données reçues invalides :", data);
        return;
    }

    // Récupère les valeurs des filtres
    const dateDebut = document.getElementById("dateDebut").value;
    const dateFin = document.getElementById("dateFin").value;

    // Filtre les données si les dates sont renseignées
    let filteredData = data.filter(entry => {
        //console.log("chargerDonnees: filtrage des données");
        if (dateDebut && entry.date <= dateDebut) return false;
        if (dateFin && entry.date >= dateFin) return false;
        return true;
    });

    // Trie les données par date croissante
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    let tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";
    let totalDuree = 0;
    let totalKm = 0;
    filteredData.forEach(entry => {
        let row = tableBody.insertRow();
        // 1ère cellule : Boutons Modifier & Supprimer
        let actionCell = row.insertCell(0);

        let editButton = document.createElement('button');
        editButton.classList.add("btn-action", "btn-modifier");
        // editButton.textContent = "Modifier";
        editButton.onclick = () => modifierEntree(entry.id);
        actionCell.appendChild(editButton);

        let deleteButton = document.createElement('button');
        deleteButton.classList.add("btn-action", "btn-supprimer");
        // deleteButton.textContent = "Supprimer";
        deleteButton.onclick = () => supprimerEntree(entry.id);
        deleteButton.style.marginLeft = "10px"; // Espacement entre les boutons
        actionCell.appendChild(deleteButton);

        // calcul de la durée pour affichage en heure:min dans la page 
        const dureeHHMM = minutesToHHMM(entry.duree);

        // formatage de la date en jj mm aaaa
        const dateFR = formatDateFR(entry.date);

        // insertion des données
        row.insertCell(1).textContent = dateFR;
        row.insertCell(2).textContent = entry.heure_debut;
        row.insertCell(3).textContent = entry.heure_fin;
        row.insertCell(4).textContent = dureeHHMM;
        row.insertCell(5).textContent = entry.km;

        // Calcul des totaux
        totalDuree += entry.duree;
        totalKm += Number(entry.km);
        
    });

    // affichage des totaux dans le tfoot
    const tfoot = document.querySelector("tfoot");
    if (tfoot) {
        const dureeTotaleHHMM = minutesToHHMM(totalDuree);
        tfoot.innerHTML = `
            <tr>
                <th>Totaux</th>
                <th>-</th>
                <th>-</th>
                <th>-</th>
                <th>${dureeTotaleHHMM}</th>
                <th>${totalKm}</th>
            </tr>
        `;
    }

}

async function modifierEntree(id) {
    //console.log("modifierEntree dans script.js");

    // Récupère les données de l'entrée à modifier
    let response = await fetch(`${API_URL}/donnees`);
    let data = await response.json();
    let entry = data.find(e => e.id === id);
    if (!entry) {
        alert("Entrée non trouvée.");
        return;
    }

    // Affiche la page de saisie
    showPage('saisie');

    // Pré-remplit les champs
    document.getElementById("date").value = entry.date;
    document.getElementById("heure_debut").value = entry.heure_debut;
    document.getElementById("heure_fin").value = entry.heure_fin;
    document.getElementById("km").value = entry.km;

    let messageDiv = document.getElementById("saisie-message");
    let addBtn = document.querySelector("#saisie button[onclick='ajouterEntree()']");
    addBtn.textContent = "Enregistrer";
    messageDiv.textContent = "";
    messageDiv.style.color = "red";

    // On remplace le onclick du bouton pour gérer les deux étapes
    addBtn.onclick = async function() {
        let date = document.getElementById("date").value;
        let heure_debut = document.getElementById("heure_debut").value;
        let heure_fin = document.getElementById("heure_fin").value;
        let km = document.getElementById("km").value;

        // Si le bouton est en mode "Enregistrer"
        if (addBtn.textContent === "Enregistrer") {
            if (date && heure_debut && heure_fin && km) {
                const dateFR = formatDateFR(date);
                messageDiv.style.color = "#39FF14";
                messageDiv.innerHTML = `
                    <strong>Récapitulatif de la modification :</strong><br>
                    Date : ${dateFR}<br>
                    Heure début : ${heure_debut}<br>
                    Heure fin : ${heure_fin}<br>
                    KM parcourus : ${km}
                `;
                addBtn.textContent = "Valider";
            } else {
                messageDiv.textContent = "Veuillez remplir tous les champs";
            }
        }
        // Si le bouton est en mode "Valider"
        else if (addBtn.textContent === "Valider") {
            const response = await fetch(`${API_URL}/modifier/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, heure_debut, heure_fin, km })
            });
            if (response.ok) {
                messageDiv.style.color = "#39FF14";
                messageDiv.innerHTML = "Modification enregistrée avec succès !";
                addBtn.textContent = "Ajouter";
                addBtn.onclick = ajouterEntree;
                // Réinitialise les champs
                document.getElementById("date").value = "";
                document.getElementById("heure_debut").value = "";
                document.getElementById("heure_fin").value = "";
                document.getElementById("km").value = "";
                messageDiv.textContent = "";
                // Revient sur la page liste
                showPage('liste');
                chargerDonnees();
            } else {
                messageDiv.style.color = "red";
                messageDiv.textContent = "Erreur lors de la modification.";
            }
        }
    };
}

async function supprimerEntree(id) {
    if (confirm("Voulez-vous vraiment supprimer cette entrée ?")) {
        await fetch(`${API_URL}/supprimer/${id}`, { method: 'DELETE' });
        chargerDonnees();
    }
}

chargerDonnees();

function showPage(id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(id).classList.add('active');

      // Initialisation des champs seulement si on est en mode ajout
    if (id === "saisie") {
        let addBtn = document.querySelector("#saisie button[onclick='ajouterEntree()']");
        if (addBtn.textContent === "Ajouter") {
            const now = new Date();
            const yyyy_mm_dd = now.toISOString().slice(0, 10);
            const hh_mm = now.toTimeString().slice(0, 5);
            document.getElementById("date").value = yyyy_mm_dd;
            document.getElementById("heure_fin").value = hh_mm;
            document.getElementById("heure_debut").value = "16:30";
            document.getElementById("km").value = "";
            document.getElementById("saisie-message").textContent = "";
        }
    }
}

// conversion minutes -> heures:minutes
function minutesToHHMM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// formatage de la date avant affichage
function formatDateFR(dateStr) {
    //console.log("formatDateFR: ", dateStr);
    const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const d = new Date(dateStr);
    const jour = d.getDate().toString().padStart(2, '0');
    const mois = (d.getMonth() + 1).toString().padStart(2, '0');
    const annee = d.getFullYear();
    const nomJour = jours[d.getDay()];
    return `${jour}/${mois}/${annee} (${nomJour})`;
}

// Application du filtrage des dates dès que les dates sont modifiées
document.getElementById("dateDebut").addEventListener("change", chargerDonnees);
document.getElementById("dateFin").addEventListener("change", chargerDonnees);

// mysql -h mysql.railway.internal -u root -p AeCHnpzSCulmJKEcXCGPjFrwFTtDecnD railway -P 3306