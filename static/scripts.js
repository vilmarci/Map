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
    fetch(`/quiz/${filename}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('quiz-title').textContent = data.metadata.name;
            document.getElementById('quiz-description').textContent = data.metadata.description;
            // Set the map focus based on bounds or show the whole world
            if (data.metadata.bounds) {
                map = L.map('map').fitBounds(data.metadata.bounds);
            } else {
                map = L.map('map').setView([20, 0], 2);  // Default to the whole world view
            }

            loadExtraLayers(data.extralayers);
            document.getElementById('quiz-selection').style.display = 'none';
            document.getElementById('sources').style.display = 'none';
            document.getElementById('quiz-container').style.display = 'block';
            document.getElementById('finished-message').style.display = 'none'; // Hide finished message
            loadFirstQuestion();
        });
}

function loadFirstQuestion() {
    fetch(`/next_question/${currentQuiz}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // No more questions available
                document.getElementById('quiz-container').style.display = 'none';
                document.getElementById('finished-message').style.display = 'block'; // Show finished message
            } else {
                loadQuestion(data);
                bringGeoDataLayerToFront();  // Ensure geojsonLayer is brought to the front
            }
        });
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
    document.getElementById('question').textContent = questionText;

    // Load new GeoJSON layer for the question
    loadGeoDataLayer(data.geodata.file, data.geodata.style);
}

function loadGeoDataLayer(geodataFile, style) {
    // Remove previous GeoJSON layer
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // Add new GeoJSON layer
    // updated
    geojsonLayer = new L.GeoJSON.AJAX(`/geojson/${geodataFile}`, {
        style: style,
        onEachFeature: function(feature, layer) {
            layer.on('mouseover', function() {
                layer.setStyle(highlightStyle);
            });
            layer.on('mouseout', function() {
                layer.setStyle(style);
            });
            layer.on('click', function() {

                if (feature.properties.name === currentQuestionData.question.name) {
                    layer.setStyle({ color: "#00FF00", weight: 3, fillOpacity: 0.3 });  // Green for correct answer
                    
                    if (currentQuestionStatus === 'new') {
                        currentQuestionStatus = 'pass'; // Update status to pass
                    }
                    setTimeout(function() {
                        layer.setStyle(style);
                        loadNextQuestion();
                    }, 1000);
                } else {
                    layer.setStyle({ color: "#FF0000", weight: 3, fillOpacity: 0.3 });  // Red for incorrect answer
                    if (currentQuestionStatus === 'new') {
                        currentQuestionStatus = 'fail'; // Update status to fail
                    }
                    setTimeout(function() {
                        layer.setStyle(style);
                    }, 1000);
                }
            
        });
        }
    }).addTo(map);
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

function loadNextQuestion() {
    if (currentQuestionStatus === 'pass') {
        passedQuestions++;
    }
    if (currentQuestionStatus !== 'new') {
        totalQuestions++;
    }
    updateScore(); // Update score display

    fetch(`/next_question/${currentQuiz}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // No more questions available
                document.getElementById('quiz-container').style.display = 'none';
                document.getElementById('finished-message').style.display = 'block'; // Show finished message
            } else {
                loadQuestion(data);
                bringGeoDataLayerToFront();  // Ensure geojsonLayer is brought to the front
            }
        });
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
   // scoreContainer.textContent = `Score: ${passedQuestions}/${totalQuestions}`;
   scorePassedDiv.textContent = `${passedQuestions}`;
   scoreTotalDiv.textContent = `${totalQuestions}`;
}

window.onload = function() {
    // The quiz list is populated by server-side rendering
};