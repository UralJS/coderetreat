const spaghetti = {
    init: function() {
        this._container = document.querySelector(".js-main");
        this._sessions = [];
        this._session = {};
        this._previousPairs = [];
        this._updatedPlayers = [];

        this.initFirebase();
    },

    initFirebase: function() {
        firebase.initializeApp({
            apiKey: "AIzaSyDf9WHGAXI9t3JkUOejSiE_FpDejKRTsTQ",
            authDomain: "uraljs-core-rretreat-1.firebaseapp.com",
            databaseURL: "https://uraljs-core-rretreat-1.firebaseio.com",
            projectId: "uraljs-core-rretreat-1",
            storageBucket: "uraljs-core-rretreat-1.appspot.com",
            messagingSenderId: "473868642633"
        });

        this._ref = firebase.database().ref();

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.initSession();
            } else {
                this.renderLoginButton();
            }
        });
    },

    initSession: function() {
        this._ref
            .once("value")
            .then(snapshot => {
                this.prepareSession(snapshot.val());
                this.render();
            });
    },

    prepareSession: function({ players, sessions }) {
        this._sessions = sessions;

        this._session = {
            id: sessions.length,
            pairs: []
        };

        const playersOnline = players.filter(p => p.isHere);
        const experts = _.shuffle(playersOnline.filter(p => p.expert));
        const guests = _.shuffle(playersOnline.filter(p => !p.expert))
            .sort((a, b) => a.sessionsWithExpert - b.sessionsWithExpert);

        this._updatedPlayers = [...players];

        this._previousPairs = this.getPreviousPairs();

        for (let i = 0; i < experts.length; i++) {
            for (let j = 0; j < guests.length; j++) {
                if (!guests[j]) {
                    continue;
                }

                const pair = [experts[i].id, guests[j].id];

                if (this.isPairFirstTime(pair)) {
                    this._session.pairs.push({ pair });
                    const playerIndexToUpdate = this._updatedPlayers.findIndex(player => player.id === guests[j].id);
                    this._updatedPlayers[playerIndexToUpdate].sessionsWithExpert++;
                    delete guests[j];
                    break;
                }
            }
        }

        let leftGuests = guests.filter(g => g);

        let triesCounter = 5;
        let leftPairs = [];

        while (true) {
            if (triesCounter > 0) {
                leftPairs = [];
                let allFirstTime = true;
                const shuffledLeft = _.shuffle(leftGuests);

                for (let i = 0; i < shuffledLeft.length; i = i + 2) {
                    const pair = [shuffledLeft[i].id];

                    if (shuffledLeft[i + 1]) {
                        pair.push(shuffledLeft[i + 1].id);
                    }

                    if (!this.isPairFirstTime(pair)) {
                        allFirstTime = false;
                    }

                    leftPairs.push({ pair });
                }

                if (allFirstTime) {
                    this._session.pairs = this._session.pairs.concat(leftPairs);
                    break;
                }
            } else {
                this._session.pairs = this._session.pairs.concat(leftPairs);
                break;
            }

            triesCounter--;
        }

        this._session.pairs.forEach((p, i) => {
            this._session.pairs[i].tableNumber = i + 1;
        });

        console.log("session", this._session);
        console.log("players", this._updatedPlayers);
    },

    getPreviousPairs: function() {
        return this._sessions.reduce((result, s) => result.concat((s.pairs || []).map(p => p.pair)), [])
    },

    isPairFirstTime: function(pair) {
        return !this._previousPairs.find(p => _.isEqual(p, pair.sort((a,b) => a-b)).length === 0)
    },

    findPlayerById: function(id) {
        return this._updatedPlayers.find(player => player.id === id);
    },

    renderLoginButton: function() {
        this._container.innerHTML = "";
        this._container.innerHTML = `<button type="button" class="js-login btn btn-primary">Стучите, открыто</button>`;

        const login = this._container.querySelector(".js-login");
        login.onclick = this.signIn;
    },

    render: function() {
        this._container.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.classList.add("clearfix");

        const header = document.createElement("h1");
        header.innerHTML = `Сессия №${this._session.id}`;
        wrapper.appendChild(header);

        this._session.pairs.forEach(pair => {
            wrapper.appendChild(this.renderTable(pair));
        });

        this._container.appendChild(wrapper);
        this._container.appendChild(this.renderSaveButton());
    },

    renderTable: function({ tableNumber, pair } = {}) {
        const table = document.createElement("div");
        table.classList.add("col-lg-4");
        table.classList.add("col-md-4");
        table.classList.add("col-sm-6");
        table.classList.add("col-xs-12");

        const members = pair.map(this.findPlayerById.bind(this)).map(({ firstName, lastName }) => `${firstName} ${lastName}`);

        table.innerHTML = `
            <div>Стол №${tableNumber}:</div>
            <div>${members.join(", ")}</div>
        `;

        return table;
    },

    renderSaveButton: function() {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("style", "margin-top: 20px");
        wrapper.innerHTML = `<button type="button" class="js-save btn btn-primary center-block">Сохранить сессию</button>`;

        const button = wrapper.querySelector(".js-save");
        button.onclick = this.updateDB.bind(this);

        return wrapper;
    },

    signIn: function() {
        firebase
            .auth()
            .signInWithPopup(new firebase.auth.GoogleAuthProvider())
            .catch(function(error) {
                console.error(error);
            });
    },

    updateDB: function() {
        this._sessions.push(this._session);

        this._ref
            .child("sessions")
            .set(this._sessions);

        this._ref
            .child("players")
            .set(this._updatedPlayers);
    }
};

window.onload = () => {
    spaghetti.init();
};