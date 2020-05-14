/*
* Load video from a local file. Implemented by Dimitar Bonev as answered on StackOverflow.
*
* @link https://jsfiddle.net/dsbonev/cCCZ2/
*/
(function localFileVideoPlayer() {
    var URL = window.URL || window.webkitURL;
    var playSelectedFile = function(event) {
        var file = this.files[0]
        var type = file.type
        var videoNode = document.querySelector('video')
        var canPlay = videoNode.canPlayType(type)
        if (canPlay === '') canPlay = 'no'
        var message = 'Can play type "' + type + '": ' + canPlay
        var isError = canPlay === 'no'
        displayMessage(message, isError)
        if (isError) {
            return
        }
        var fileURL = URL.createObjectURL(file)
        videoNode.src = fileURL;
        setTimeout(function() { cuts = PF_SRT.parse(skipBox.value);
            setActions();
            makeTimeLabels() }, 1000)
    }
    var inputNode = document.querySelector('input')
    inputNode.addEventListener('change', playSelectedFile, false)
})();

/*
* Display a message  in the #videoMsg element from HTML.
*
* @param {String} message - Message to be displayed in the HTML object.
* @param {String} isError - String representing whether is an error message.
*/
var displayMessage = function(message, isError) {
    var element = document.querySelector('#videoMsg')
    element.innerHTML = message
    element.className = isError ? 'error' : 'info'
}

var name = ''; //global variable with name of skip file, minus extension
var cuts = []; //global variable containing the cuts, each array element is an object with this format {startTime,endTime,text,action}
var ua = navigator.userAgent.toLowerCase(); //to add a fix for Safari and choose fastest filter method, per https://jsben.ch/5qRcU
if (ua.indexOf('safari') != -1) {
    if (ua.indexOf('chrome') == -1) {
        var isSafari = true
    } else {
        var isChrome = true
    }
} else if (typeof InstallTrigger !== 'undefined') {
    var isFirefox = true
} else if (document.documentMode || /Edge/.test(navigator.userAgent)) {
    var isEdge = true
}
if (isSafari) videoFile.accept = 'video/mp4,video/x-m4v,video/*'; //file loading fix


/*
* Loads the skips file.
*/
function loadFileAsURL() {
    var fileToLoad = skipFile.files[0],
        fileReader = new FileReader();
    fileReader.onload = function(fileLoadedEvent) {
        var URLFromFileLoaded = fileLoadedEvent.target.result;
        var extension = fileToLoad.name.slice(-4);
        if (extension == ".skp") {
            var data = URLFromFileLoaded.split('data:image/jpeg;base64,'); //separate skips from screenshot
            name = fileToLoad.name.slice(0, -4);
            skipBox.value = data[0].trim();
            if (data[1]) screenShot.src = 'data:image/jpeg;base64,' + data[1];
        } else {
            boxMsg.textContent = "wrong file type"
        }
    };
    fileReader.readAsText(fileToLoad);
    boxMsg.textContent = 'This is the content of file: ' + fileToLoad.name;
    setTimeout(function() { cuts = PF_SRT.parse(skipBox.value);
        setActions();
        makeTimeLabels() }, 1000) //give it a whole second to load before data is extracted to memory
}

/*
* Load subtitles file.
*/
function loadSubs() {
    var fileToLoad = subFile.files[0],
        fileReader = new FileReader();
    fileReader.onload = function(fileLoadedEvent) {
        var URLFromFileLoaded = fileLoadedEvent.target.result;
        var extension = fileToLoad.name.slice(-4);
        if (extension == ".vtt" || extension == ".srt") { //allow only .vtt and .srt formats
            track = document.createElement("track");
            track.kind = "captions";
            track.label = "Loaded";
            track.srclang = "en";
            if (extension == ".vtt") {
                track.src = URL.createObjectURL(fileToLoad)
            } else {
                var subs = URLFromFileLoaded; //get subs in text format, to be edited
                subs = 'WEBVTT\n\n' + subs.replace(/(\d),(\d)/g, '$1.$2'); //convert decimal commas to periods and add header
                var subBlob = new Blob([subs], { "type": 'text/plain' });
                track.src = URL.createObjectURL(subBlob);
            }
            track.addEventListener("load", function() {
                this.mode = "showing";
                myVideo.textTracks[0].mode = "showing"; // thanks Firefox
            });
            myVideo.appendChild(track);
            displayMessage("Subtitles loaded. Enable them in the video with lower right icon", false)
        } else {
            displayMessage("Only .vtt  and .srt subs are supported", true)
        }
    };
    fileReader.readAsText(fileToLoad)
}

/*
* Download data to a file.
*
* @link StackOverflow
*
* @param {Object} data     - Data to be extracted.
* @param {String} filename - Path of the file.
* @param {String} type     - Type of the data to download.
*/
function download(data, filename, type) {
    var a = document.createElement("a");
    var file = new Blob([data], { "type": type }),
        url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0)
}

/*
* Parse the content of the skip box in something close to .srt format.
*
* @link StackOverflow
*/
var PF_SRT = function() {
    //SRT format
    var pattern = /([\d:,.]+)\s*-+\>\s*([\d:,.]+)\n([\s\S]*?(?=\n{2}|$))?/gm; //no item number, can use decimal dot instead of comma, malformed arrows
    var _regExp;
    var init = function() {
        _regExp = new RegExp(pattern);
    };
    var parse = function(f) {
        if (typeof(f) != "string")
            throw "Sorry, the parser accepts only strings";
        var result = [];
        if (f == null)
            return _subtitles;
        f = f.replace(/\r\n|\r|\n/g, '\n')
        while ((matches = pattern.exec(f)) != null) {
            result.push(toLineObj(matches));
        }
        return result;
    }
    var toLineObj = function(group) {
        return {
            startTime: fromHMS(group[1]),
            endTime: fromHMS(group[2]),
            text: group[3],
            action: '' //no action by default, to be filled later
        };
    }
    init();
    return {
        parse: parse
    }
}();

/*
* Convert seconds into hour:minute:second.
*
* @param {Number} seconds - Total seconds to re-format.
*
* @return {String} Seconds with format hour:minute:second.
*/
function toHMS(seconds) {
    var hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    var minutes = Math.floor(seconds / 60);
    minutes = (minutes >= 10) ? minutes : "0" + minutes;
    seconds = Math.floor((seconds % 60) * 100) / 100; //precision is 0.01 s
    seconds = (seconds >= 10) ? seconds : "0" + seconds;
    return hours + ":" + minutes + ":" + seconds;
}

/*
* Convert hour:minute:second string to seconds.
*
* @param {String} timeString - Time in format hour:minute:second
*
* @return {Number} Float representing total seconds.
*/
function fromHMS(timeString) {
    timeString = timeString.replace(/,/, "."); //in .srt format decimal seconds use a comma
    var time = timeString.split(":");
    if (time.length == 3) { //has hours
        return parseInt(time[0]) * 3600 + parseInt(time[1]) * 60 + parseFloat(time[2])
    } else if (time.length == 2) { //minutes and seconds
        return parseInt(time[0]) * 60 + parseFloat(time[1])
    } else { //only seconds
        return parseFloat(time[0])
    }
}

/*
* Shifts all times by a number of seconds entered in prompt.
*/
function shiftTimes() {
    var reply = prompt('Enter seconds to delay skips (negative for advance), or leave empty to sort the timings in ascending order');
    if (reply == null) { boxMsg.textContent = 'Time shift canceled'; return };

    var initialData = skipBox.value.trim().split('\n').slice(0, 2); //first two lines
    var shotTime = fromHMS(initialData[0]);

    if (reply) { //number entered, so apply the given shift
        var seconds = parseFloat(reply);
        for (var i = 0; i < cuts.length; i++) {
            cuts[i].startTime += seconds;
            cuts[i].endTime += seconds
        }
    } else { //nothing entered, so sort the times in ascending order
        cuts.sort(function(a, b) { return a.startTime - b.startTime; })
    }
    times2box(); //put shifted times in the box

    if (shotTime) { //reconstruct initial data, if present
        if (seconds) initialData[0] = toHMS(shotTime + seconds);
        skipBox.value = initialData.join('\n') + '\n\n' + skipBox.value
    }
    if (!seconds) {
        boxMsg.textContent = "Skips sorted by start time"
    } else if (seconds >= 0) {
        boxMsg.textContent = "Skips delayed by " + Math.floor(seconds * 100) / 100 + " seconds"
    } else {
        boxMsg.textContent = "Skips advanced by " + Math.floor(-seconds * 100) / 100 + " seconds"
    }
    setTimeout(function() { makeTimeLabels(); if (isSuper) moveShot() }, 100)
}

/*
* Shift all times so the screenshot has correct timing in the video. 
* ShiftTimes also has this functionality, with empty input.
*/
function syncTimes() {
    var initialData = skipBox.value.trim().split('\n').slice(0, 2), //first two lines
        shotTime = fromHMS(initialData[0]),
        seconds = shotTime ? myVideo.currentTime - shotTime : 0;
    for (var i = 0; i < cuts.length; i++) {
        cuts[i].startTime += seconds;
        cuts[i].endTime += seconds
    }
    times2box(); //put shifted times in the box

    if (shotTime) { //reconstruct initial data, if present
        initialData[0] = toHMS(shotTime + seconds);
        skipBox.value = initialData.join('\n') + '\n\n' + skipBox.value
    }
    if (seconds >= 0) {
        boxMsg.textContent = "Skips delayed by " + Math.floor(seconds * 100) / 100 + " seconds"
    } else {
        boxMsg.textContent = "Skips advanced by " + Math.floor(-seconds * 100) / 100 + " seconds"
    }
    setTimeout(function() { makeTimeLabels(); if (isSuper) moveShot() }, 100)
}

/*
* Put data from the cuts array into skipBox.
*/
function times2box() {
    var text = '';
    for (var i = 0; i < cuts.length; i++) {
        text += toHMS(cuts[i].startTime) + ' --> ' + toHMS(cuts[i].endTime) + '\n' + cuts[i].text + '\n\n'
    }
    skipBox.value = text.trim();
    setTimeout(function() { makeTimeLabels() }, 100)
}

/*
* Insert string in box, at cursor or replacing selection.
*
* @param {String}  string  - Text to insert.
* @param {Boolean} isScrub - Boolean.
*/
function writeIn(string, isScrub) {
    var start = skipBox.selectionStart,
        end = skipBox.selectionEnd,
        newEnd = start + string.length;
    skipBox.value = skipBox.value.slice(0, start) + string + skipBox.value.slice(end, skipBox.length);
    if (isScrub) {
        skipBox.setSelectionRange(start, newEnd)
    } else {
        skipBox.setSelectionRange(newEnd, newEnd);
    }
    setTimeout(function() { cuts = PF_SRT.parse(skipBox.value);
        setActions();
        makeTimeLabels() }, 100);
    skipBox.focus()
}

/*
* Gets index of a particular HMS time in the box
*
* @param {String} string - Text to obtain the index from.
*/
function getTimeIndex(string) {
    var stringStart = skipBox.value.indexOf(string);
    for (var i = 0; i < timeLabels[0].length; i++) {
        if (timeLabels[0][i].match(string)) return i
    }
}

/*
* Forwar Skip part of the video.
*
* Called by forward button
*/
function fwdSkip() {
    if (myVideo.paused) {
        var selection = skipBox.value.slice(skipBox.selectionStart, skipBox.selectionEnd).trim();
        if (selection != '' && !selection.match(/[^\d:.]/)) { //valid time selected, so scrub to next time
            var index = getTimeIndex(selection);
            if (index != null) {
                if (shiftMode.checked) {
                    myVideo.currentTime = fromHMS(timeLabels[0][index]); //first go there
                    myVideo.currentTime += fineMode.checked ? 0.0417 : 0.417; //now scrub by a small amount
                    writeIn(toHMS(myVideo.currentTime), true); //and write it in
                    skipBox.focus()
                } else {
                    var nextIndex = index + 1;
                    if (nextIndex >= timeLabels[0].length) nextIndex = 0;
                    myVideo.currentTime = fromHMS(timeLabels[0][nextIndex]);
                    skipBox.selectionStart = timeLabels[1][nextIndex];
                    skipBox.selectionEnd = timeLabels[2][nextIndex];
                    skipBox.focus()
                }
            }
        } else { //scrub by a small amount
            myVideo.currentTime += fineMode.checked ? 0.0417 : 0.417
        }
    } else {
        myVideo.pause();
        speedMode = 0
    }
}

/*
* Backwards Skip part of the video.
*
* Called by back button.
*/
function backSkip() {
    if (myVideo.paused) {
        var selection = skipBox.value.slice(skipBox.selectionStart, skipBox.selectionEnd).trim();
        if (selection != '' && !selection.match(/[^\d:.]/)) { //valid time selected, so scrub to next time
            var index = getTimeIndex(selection);
            if (index != null) {
                if (shiftMode.checked) {
                    myVideo.currentTime = fromHMS(timeLabels[0][index]); //first go there
                    myVideo.currentTime -= fineMode.checked ? 0.0417 : 0.417; //now scrub by a small amount
                    writeIn(toHMS(myVideo.currentTime), true); //and write it in
                    skipBox.focus()
                } else {
                    var nextIndex = index - 1;
                    if (nextIndex < 0) nextIndex = timeLabels[0].length - 1;
                    myVideo.currentTime = fromHMS(timeLabels[0][nextIndex]);
                    skipBox.selectionStart = timeLabels[1][nextIndex];
                    skipBox.selectionEnd = timeLabels[2][nextIndex];
                    skipBox.focus()
                }
            }
        } else { //scrub by a small amount
            myVideo.currentTime -= fineMode.checked ? 0.0417 : 0.417
        }
    } else {
        myVideo.pause();
        speedMode = 0
    }
}

var speedMode = 1;
/*
* Toggles normal, max and zerp speeds
*/
function toggleFF() {
    if (myVideo.paused) { //if paused, restart, no speed change
        speedMode = 1;
        myVideo.muted = false;
        myVideo.playbackRate = 1;
        myVideo.play()
    } else { //if playing, set speed
        if (speedMode == 1) {
            speedMode = 2;
            myVideo.muted = true;
            myVideo.playbackRate = 16
        } else {
            speedMode = 0;
            myVideo.muted = false;
            myVideo.playbackRate = 1;
            myVideo.pause()
        }
    }
}
//for screenshots
var canvas = document.createElement('canvas');
canvas.width = 320; //for full scale: myVideo.videoWidth - 100
canvas.height = 240;
var ctx = canvas.getContext('2d')

/*
* Take a screen shot.
*/
function makeShot() {
    myVideo.pause();
    skipBox.value = toHMS(myVideo.currentTime) + '\n' + skipBox.value; //put time at start
    //draw image to canvas. scale to target dimensions
    canvas.width = myVideo.videoWidth / myVideo.videoHeight * canvas.height;
    ctx.drawImage(myVideo, 0, 0, canvas.width, canvas.height);
    //convert to desired file format
    var dataURI = canvas.toDataURL('image/jpeg'); // can also use 'image/png' but the file is 10x bigger
    screenShot.src = dataURI
}

/*
* Scrub to first time in the box, unless a time is selected
*/
function scrub2shot() {
    myVideo.pause();
    var selection = skipBox.value.slice(skipBox.selectionStart, skipBox.selectionEnd).trim();
    if (selection != '' && !selection.match(/[^\d:.]/)) { //valid time selected, so scrub to it
        var index = getTimeIndex(selection);
        if (index != null) {
            myVideo.currentTime = fromHMS(timeLabels[0][index]);
            skipBox.focus()
        }
    } else { //scrub to 1st time
        myVideo.currentTime = fromHMS(timeLabels[0][0])
    }
}

var isSuper = false;
/*
* Put the screenshot on top of the video so a perfect match can be found, and back.
*/
function moveShot() {
    if (isSuper) {
        isSuper = false;
        screenShot.height = 240;
        screenShot.width = myVideo.videoWidth / myVideo.videoHeight * 240;
        screenShot.style.position = '';
        screenShot.style.top = '';
        screenShot.style.left = '';
        screenShot.style.opacity = ''
    } else {
        isSuper = true;
        screenShot.height = myVideo.videoHeight; //rescales the picture
        screenShot.width = myVideo.videoWidth;
        screenShot.style.position = 'absolute';
        screenShot.style.top = myVideo.offsetTop + 'px';
        screenShot.style.left = myVideo.offsetLeft + 'px';
        screenShot.style.opacity = "50%"
    }
}

var timeLabels = [];
/*
* Remakes array timeLabels containing HMS times,
* plus their positions in the box [HMS time, start, end].
*/
function makeTimeLabels() {
    timeLabels = [
        [],
        [],
        []
    ]; //string, startPosition, endPosition
    var text = skipBox.value,
        string, start, end = 0;
    var matches = text.match(/([\d:.]+)/g);
    if (matches) {
        for (var i = 0; i < matches.length; i++) {
            string = matches[i];
            timeLabels[0][i] = string;
            start = text.indexOf(string, end)
            timeLabels[1][i] = start;
            end = start + string.length;
            timeLabels[2][i] = end
        }
    }
}

/*
* Toggle instructions on and off.
*/
/*function toggleHelp() {
    if (instructions.style.display == 'none') {
        instructions.style.display = 'block'
    } else {
        instructions.style.display = 'none'
    }
}*/

//to move and resize superimposed shot
document.onkeydown = checkKey;
function checkKey(e) {
    if (isSuper) { //this only works when a screenshot is superimposed on the video
        e = e || window.event;
        if (e.altKey) { //alt combinations resize, regular moves, hold shift for fine movement
            if (e.keyCode == '38') {
                screenShot.height -= e.shiftKey ? 1 : 10
            } else if (e.keyCode == '40') {
                screenShot.height += e.shiftKey ? 1 : 10
            } else if (e.keyCode == '37') {
                screenShot.width -= e.shiftKey ? 1 : 10
            } else if (e.keyCode == '39') {
                screenShot.width += e.shiftKey ? 1 : 10
            }
        } else { //move shot
            if (e.keyCode == '38') {
                screenShot.style.top = parseInt(screenShot.style.top.slice(0, -2)) - (e.shiftKey ? 1 : 10) + 'px'
            } else if (e.keyCode == '40') {
                screenShot.style.top = parseInt(screenShot.style.top.slice(0, -2)) + (e.shiftKey ? 1 : 10) + 'px'
            } else if (e.keyCode == '37') {
                screenShot.style.left = parseInt(screenShot.style.left.slice(0, -2)) - (e.shiftKey ? 1 : 10) + 'px'
            } else if (e.keyCode == '39') {
                screenShot.style.left = parseInt(screenShot.style.left.slice(0, -2)) + (e.shiftKey ? 1 : 10) + 'px'
            }
        }
    }
}

checkBoxes.addEventListener('change', setActions);
skipFile.addEventListener('change', loadFileAsURL);
/*exchangeBtn.addEventListener('click', function(){window.open('https://prgomez.com/videoskip/exchange')});*/
subFile.addEventListener('change', loadSubs);
shiftBtn.addEventListener('click', shiftTimes);
timeBtn.addEventListener('click', function() { writeIn(toHMS(myVideo.currentTime)) });
arrowBtn.addEventListener('click', function() { writeIn(' --> ') });
/*instructions.style.display = 'none';*/
/*help.addEventListener('click', toggleHelp);*/
saveFile.addEventListener('click', function() {
    if (!name) name = prompt('Enter the file name. Extension .skp wil be added');
    download(skipBox.value + '\n' + screenShot.src, name + '.skp', "text/plain");
    boxMsg.textContent = 'File saved with name ' + name + '.skp'
})
fwdBtn.addEventListener('click', fwdSkip);
fFwdBtn.addEventListener('click', toggleFF);
backBtn.addEventListener('click', backSkip);
shotTimeBtn.addEventListener('click', scrub2shot);
moveBtn.addEventListener('click', moveShot);
syncBtn.addEventListener('click', syncTimes);
shotBtn.addEventListener('click', makeShot);
skipBox.addEventListener('change', function() {
    setTimeout(function() { cuts = PF_SRT.parse(skipBox.value);
        setActions();
        makeTimeLabels() }, 100)
})

/*
* Faster way to check for content depending on browser.
*
* @param {String} containerStr.
* @param {String} stringArray.
* @param {String} regex         - Regular expression to search for.
*
* @return {Boolean} Boolean indicating if regex and stringArray content should match.
*/
function isContained(containerStr, regex) {
    var result = false;
    if (isFirefox) {
        result = containerStr.search(regex) != -1
    } else if (isSafari || isEdge || isChrome) {
        result = regex.test(containerStr)
    } else {
        result = !!containerStr.match(regex)
    }
    return result
}

/*
* To decide whether a particular content is to be skipped, according to check boxes.
* Allows alternative and incomplete keywords.
*
* @param {String} label - Label to check if it is to be skipped.
*
· @return {Boolean} Boolean indicating whether it needs to be skipped.
*/
function isSkipped(label) {
    if (isContained(label, /sex|nud/) && sexMode.checked) {
        return true
    } else if (isContained(label, /vio|gor/) && violenceMode.checked) {
        return true
    } else if (isContained(label, /pro|cur|hat/) && curseMode.checked) {
        return true
    } else if (isContained(label, /alc|dru|smo/) && boozeMode.checked) {
        return true
    } else if (isContained(label, /fri|sca|int/) && scareMode.checked) {
        return true
    } else if (isContained(label, /oth|bor/) && otherMode.checked) {
        return true
    } else {
        return false
    }
}

/*
* Fills the action field in object cuts, according to the position of the check boxes
* and the text at each time.
*/
function setActions() {
    for (var i = 0; i < cuts.length; i++) {
        var label = cuts[i].text.toLowerCase().replace(/\(.*\)/g, ''), //ignore text in parentheses
            isAudio = isContained(label, /aud|sou|spe|wor/),
            isVideo = isContained(label, /vid|ima|img/);
        if (!isAudio && !isVideo) {
            cuts[i].action = isSkipped(label) ? 'skip' : ''
        } else if (isAudio) {
            cuts[i].action = isSkipped(label) ? 'mute' : ''
        } else {
            cuts[i].action = isSkipped(label) ? 'blank' : ''
        }
    }
}
var prevAction = '';

//to skip video during playback
myVideo.ontimeupdate = function() {
    var action = '',
        startTime, endTime;
    for (var i = 0; i < cuts.length; i++) { //find out what action to take, according to timing and setting in cuts object
        startTime = cuts[i].startTime;
        endTime = cuts[i].endTime;
        if (myVideo.currentTime > startTime && myVideo.currentTime < endTime) {
            action = cuts[i].action;
            break
        } else {
            action = ''
        }
    }
    if (action == prevAction) { //apply action to the DOM if there's a change
        return
    } else if (action == 'skip') {
        myVideo.currentTime = endTime
    } else if (action == 'blank') {
        myVideo.style.opacity = 0
    } else if (action == 'mute') {
        myVideo.muted = true;
        if (myVideo.textTracks.length > 0) myVideo.textTracks[0].mode = 'disabled'
    } else {
        myVideo.style.opacity = '';
        myVideo.muted = false;
        if (myVideo.textTracks.length > 0) myVideo.textTracks[0].mode = 'showing'
    }
    prevAction = action
}