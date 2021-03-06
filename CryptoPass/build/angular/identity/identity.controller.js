app.controller('identityController', function ($scope) {
  $scope.identity = masterObj.identity;
})

app.controller('singleIdentityController', function($scope, $stateParams, $state){
  $scope.identity = masterObj.identity.filter(info => info.id == $stateParams.id)[0]
  $scope.updateInfo = false;
  $scope.newAccount = angular.copy($scope.identity)

  $scope.getImg = getImg

  $scope.showForm = function () {
    $scope.updateInfo = !$scope.updateInfo;
  }

  $scope.changeInfo = function (){
    for (var key in $scope.newAccount){
      if ($scope.identity[key] !== $scope.newAccount[key]){
        $scope.identity[key] = $scope.newAccount[key]
      }
    }
    $scope.identity.lastUpdated = moment().format('MMMM Do YYYY, h:mm:ss a');
    encryptFile(masterObj, masterPass)
    .then(()=>{
      return settings.get('dropboxPath')
    })
    .then(val => {
      var encrypted = encrypt(JSON.stringify(masterObj), masterPass)
      socket.emit('addFromElectron', {data: encrypted, dropboxPath: val, fsSettingsPath: fsSettingsPath})
      $state.reload()
    })
  }

})

app.controller('addIdentityController', function($scope, $state, $stateParams, $rootScope) {
  var settings = require('electron-settings')
  $scope.identity = {
  	name: null,
  	data: null
  }

  $scope.createId = function() {
    var newId = idGenerator($scope.identity)
    $scope.identity.id = newId
    $scope.identity.createdAt = moment().format('MMMM Do YYYY, h:mm:ss a');
    $scope.identity.lastUpdated = moment().format('MMMM Do YYYY, h:mm:ss a');
    if ($scope.identity) masterObj.identity.push($scope.identity)
    encryptFile(masterObj, masterPass)
    .then(()=>{
      return settings.get('dropboxPath')
    })
    .then(path => {
      var encrypted = encrypt(JSON.stringify(masterObj), masterPass)
      socket.emit('addFromElectron', { data: encrypted, dropboxPath: path, fsSettingsPath: fsSettingsPath })
      $rootScope.$evalAsync()
      $state.go('identity.single', { id: newId }, {reload: true})
    })
  }

})
