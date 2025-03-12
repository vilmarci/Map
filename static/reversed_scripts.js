var map;
var geojsonLayer;
var currentQuiz;
var extraLayers = [];
var currentQuestionData;
var passedQuestions = 0;
var totalQuestions = 0;
var currentQuestionStatus = 'new'; // Track the current question status
var currentFile = '';

// Highlight style for GeoJSON layer
var highlightStyle = {
    color: "#00008B",  // Darker blue
    weight: 3,
    fill: true,
    fillOpacity: 0.3
};

// Answer style for GeoJSON layer
var answerStyle = {
    color: "#FFFF00",  // Yellow
    weight: 3,
    fillOpacity: 0.5
};

function startQuiz(filename) {
    currentQuiz = filename;
    currentFile = filename;
    passedQuestions = 0; // Reset score
    totalQuestions = 0; // Reset score
    currentQuestionStatus = 'new'; // Reset current question status
    updateScore(); // Update score display

    console.log('Starting quiz:', filename); // Debugging log

    fetch(`/quiz/${filename}`)
        .then(response => response.json())
        .then(data => {
            console.log('Received quiz data:', data); // Debugging log
            document.getElementById('quiz-title').textContent = data.metadata.name;
            document.getElementById('quiz-description').textContent = data.metadata.description;

            if (!map) {
                // Initialize the map only if it doesn't exist
                if (data.metadata.bounds) {
                    map = L.map('map').fitBounds(data.metadata.bounds);
                } else {
                    map = L.map('map').setView([20, 0], 2);  // Default to the whole world view
                }
            }

            // Populate the question list with available questions
            if (data.questions && data.questions.length > 0) {
                console.log('Populating question list with:', data.questions); // Debugging log
                populateQuestionList(data.questions);
            } else {
                console.error('No questions found in quiz data'); // Debugging log
            }

            // Load extra layers only when the quiz loads
            loadExtraLayers(data.extralayers);

            // Load GeoJSON layer when the quiz loads
            if (data.geodata && data.geodata.file) {
                loadGeoDataLayer(data.geodata.file, data.geodata.style);
            } else {
                console.error('GeoData not found in quiz data'); // Debugging log
            }

            document.getElementById('quiz-selection').style.display = 'none';
            document.getElementById('sources').style.display = 'none';
            document.getElementById('quiz-container').style.display = 'block';
            document.getElementById('finished-message').style.display = 'none'; // Hide finished message
            fetchQuestion();
        })
        .catch(error => console.error('Error fetching quiz data:', error)); // Debugging log
}


function fetchQuestion() {
    fetch(`/next_question/${currentQuiz}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // No more questions available
                document.getElementById('quiz-container').style.display = 'none';
                document.getElementById('score-container').style.display = 'block';
                document.getElementById('finished-message').style.display = 'block'; // Show finished message
            } else {
                loadQuestion(data);
                // Ensure GeoJSON layer has fully loaded before highlighting
                setTimeout(function() {
                    highlightCurrentQuestion(); // Highlight the current question area
                    bringGeoDataLayerToFront();  // Ensure geojsonLayer is brought to the front
                }, 500);
            }
        })
        .catch(error => console.error('Error fetching next question:', error)); // Debugging log
}


function loadQuestion(data) {
    currentQuestionData = data;
    currentQuestionStatus = 'new'; // Reset the status for the new question
    var question = data.question;

    // Display both English and Dutch names if available
    var questionText = question.name;
    if (question.name_nl) {
        questionText += " (" + question.name_nl + ")";
    }

    // Log the GeoJSON data for debugging
    //console.log('Loading GeoJSON data:', data.geodata);

    // Load new GeoJSON layer for the question
    //loadGeoDataLayer(data.geodata.file, data.geodata.style);
}
function populateQuestionList(questions) {
    console.log('Populating question list'); // Debugging log

    // Sort the questions by name
    questions.sort(function(a, b) {
        var nameA = a.name.toUpperCase(); // Convert to uppercase to ensure case-insensitive sorting
        var nameB = b.name.toUpperCase(); // Convert to uppercase to ensure case-insensitive sorting
        if (nameA < nameB) {
            return -1; // nameA comes before nameB
        }
        if (nameA > nameB) {
            return 1; // nameA comes after nameB
        }
        return 0; // names are equal
    });

    var questionList = document.getElementById('answer-list');
    questionList.innerHTML = ''; // Clear any existing items

    questions.forEach(function(question) {
        // Create the questionText variable based on your requirements
        var questionText = question.name;
        if (question.name_nl) {
            questionText += " (" + question.name_nl + ")";
        }

        var listItem = document.createElement('li');
        listItem.innerHTML = `<button class="answer" data-name="${question.name}" onclick="checkAnswer('${question.name}')">${questionText}</button>`;
        questionList.appendChild(listItem);
    });
}






function loadGeoDataLayer(geodataFile, style) {
    // Remove previous GeoJSON layer
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // Add new GeoJSON layer
    geojsonLayer = new L.GeoJSON.AJAX(`/geojson/${geodataFile}`, {
        style: style
        // Removed the event listeners for mouseover, mouseout, and click
    }).addTo(map);
    // Log to confirm the layer is added
    console.log('GeoJSON layer added:', geojsonLayer);
    bringGeoDataLayerToFront();  // Ensure geojsonLayer is brought to the front
}


function showAnswer() {
    if (currentQuestionStatus === 'new') {
        currentQuestionStatus = 'fail'; // Update status to fail
    }
    if (geojsonLayer) {
        geojsonLayer.eachLayer(function(layer) {
            if (layer.feature.properties.name === currentQuestionData.question.name) {
                layer.setStyle(answerStyle);  // Yellow for showing answer
                setTimeout(function() {
                    layer.setStyle(currentQuestionData.geodata.style);
                }, 1000);
            }
        });
        bringGeoDataLayerToFront();  // Ensure geojsonLayer is brought to the front
    }
}

function restartQuiz() {
    startQuiz(currentFile);  // Restart the same quiz
}

function loadExtraLayers(extralayers) {
    // Remove previous extra layers
    extraLayers.forEach(layer => {
        map.removeLayer(layer);
    });
    extraLayers = [];

    // Add new extra layers
    extralayers.forEach(layerData => {
        var extraLayer = new L.GeoJSON.AJAX(`/geojson/${layerData.file}`, {
            style: layerData.style
        }).addTo(map);
        extraLayers.push(extraLayer);
    });

    // Ensure the geojsonLayer is brought to front after extra layers are added
    bringGeoDataLayerToFront();
}

function bringGeoDataLayerToFront() {
    if (geojsonLayer) {
        geojsonLayer.bringToFront();
    }
}

function showQuizSelection() {
    document.getElementById('quiz-selection').style.display = 'block';
    document.getElementById('sources').style.display = 'block';
    document.getElementById('score-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('finished-message').style.display = 'none'; // Hide finished message
    if (map) {
        map.remove();
        map = null;
    }
}

function updateScore() {
    const scoreContainer = document.getElementById('score-container');
    const scorePassedDiv = document.getElementById('score-passed');
    const scoreTotalDiv = document.getElementById('score-total');
    scoreContainer.style.display = 'block';
    scorePassedDiv.textContent = `${passedQuestions}`;
    scoreTotalDiv.textContent = `${totalQuestions}`;
}

function loadNextQuestion() {
    if (currentQuestionStatus === 'pass') {
        passedQuestions++;
    }
    if (currentQuestionStatus !== 'new') {
        totalQuestions++;
    }
    updateScore(); // Update score display

    fetchQuestion(); // Fetch next question
}

function checkAnswer(selectedName) {
    console.log('Checking answer:', selectedName); // Debugging log
    var selectedButton = document.querySelector(`button.answer[data-name='${selectedName}']`);

    if (selectedName === currentQuestionData.question.name) {
        // Correct answer
        if (currentQuestionStatus === 'new') {
            currentQuestionStatus = 'pass'; // Update status to pass
        }
        selectedButton.style.backgroundColor = '#00FF00'; // Green for correct answer
        setTimeout(function() {
            selectedButton.style.backgroundColor = ''; // Reset after 1 second
            loadNextQuestion();
        }, 1000);
    } else {
        // Incorrect answer
        if (currentQuestionStatus === 'new') {
            currentQuestionStatus = 'fail'; // Update status to fail
        }
        selectedButton.style.backgroundColor = '#FF0000'; // Red for incorrect answer
        setTimeout(function() {
            selectedButton.style.backgroundColor = ''; // Reset after 1 second
        }, 1000);
    }
}

function highlightCurrentQuestion() {
    if (geojsonLayer) {
        geojsonLayer.eachLayer(function(layer) {
            // Reset layer styles to default
            layer.setStyle(currentQuestionData.geodata.style);

            if (layer.feature.properties.name === currentQuestionData.question.name) {
                console.log('Highlighting current question:', layer.feature.properties.name);
                layer.setStyle(answerStyle);  // Apply the highlight style to the current question area
            }
        });
        bringGeoDataLayerToFront();  // Ensure geojsonLayer is brought to the front
    }
}



window.onload = function() {
    // The quiz list is populated by server-side rendering
};
