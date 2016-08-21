var EventListener = require('../event.listener')
var socket = io('http://localhost:9999', { reconnect: true });
socket.on('connect', function() {
  console.log('chrome connected');
})
var masterObj, masterPass, valid, accountInfo = {};
var eventListener = new EventListener();
var date = new Date()

eventListener.on('authentication', function (req) {
  masterPass = req.master
  $.get('http://localhost:9999/secret')
  .then(function (data){
      // try decrypting, if success emit success, otherwise reset master
    var decrypted = decrypt(data.data, masterPass)
    valid = data.check === decrypted
    // chrome.extension.sendMessage({valid: valid, eventName: 'validation'})
    if (valid){
      socket.emit('chromeValidate')
    }
  })
  .catch(function (err){
    console.error(err)
  })
})

chrome.extension.onMessage.addListener(function (req, sender, sendRes){
  updateTime()
  if (!eventListener[req.eventName]) return
	eventListener.emit(req.eventName, req);
})

eventListener.on('logins', function (data) {
  console.log('responding');
  // send only login information that could match the current website.
  // Do not want to send all information every time we visit a site in case the site is malicious
  var possibleLogins = [];
  masterObj.login.forEach(function (account){
    var lowerName = account.name.split(' ').join('').toLowerCase()
    var accountRe = new RegExp(lowerName)
    if (data.currentUrl.match(accountRe) || (account.name.toLowerCase() == 'gmail' && data.currentUrl.match(/google/))){
      possibleLogins.push(account)
    }
  })
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {eventName: 'loginRes', logins: possibleLogins})
  })
})

eventListener.on('getValid', function (data){
  chrome.extension.sendMessage({eventName: 'sendValid', valid: valid, accountInfo: accountInfo})
})

socket.on('electronAdd', function(data) {
  console.log('electronAdd socket fired and caught');
  masterObj = JSON.parse(decrypt(data.data, masterPass))
  for (var key in masterObj){
    var currentAccount = masterObj[key];
    accountInfo[key] = accountInfo[key] || {}
    accountInfo[key].items = currentAccount.map(function (acc){
      if (key == 'login'){
        return {name: acc.name, url: acc.website}
      } else{
        return {name: acc.name}
      }
    })
    accountInfo[key].category = key
  }
  chrome.extension.sendMessage({data: accountInfo, eventName: 'accountInfo'})
})

socket.on('responseChromeValidated', function(data) {
  masterObj = JSON.parse(decrypt(data.data, masterPass))
  for (var key in masterObj){
    var currentAccount = masterObj[key];
    accountInfo[key] = accountInfo[key] || {}
    accountInfo[key].items = currentAccount.map(function (acc){
      if (key == 'login'){
        return {name: acc.name, url: acc.website, deleted: acc.deleted || null}
      } else{
        return {name: acc.name, deleted: acc.deleted || null}
      }
    })
    accountInfo[key].category = key
  }
  console.log(accountInfo, 'accountInfo')
  chrome.extension.sendMessage({valid: valid, eventName: 'validation'})
  setTimeout(function (){
    chrome.extension.sendMessage({data: accountInfo, eventName: 'accountInfo'})
  }, 500)
})

socket.on('chromeClearData', function (){
  masterObj = masterPass = valid = accountInfo = null;
  console.log('masterObj cleared')
})

function updateTime(){
  date = new Date()
}

//attempting to send info to
eventListener.on('backgroundToFill', function (data){
  var toLogIn = masterObj.login.filter(function (account){
    return account.name === data.name
  })[0]
  console.log(toLogIn, window.location.href)
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      chrome.tabs.update(tabs[0].id, {url: toLogIn.website})
  })
  setTimeout(function (){
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      console.log(tabs)
      chrome.tabs.sendMessage(tabs[0].id, {eventName: 'autoFill', account: toLogIn})
    })
  }, 2000)
})


// every 5 minutes check, if you have been inactive for 15 minutes clear data
setInterval(function (){
  if (new Date() - date > 900000){
    masterObj = masterPass = valid = null;
    chrome.extension.sendMessage({eventName: 'validTimeout'})
  }
}, 300000)
