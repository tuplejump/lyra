vde.App.controller('MarksCtrl', function($scope, $rootScope, $timeout, logger) {
  // Cardinal sin
  $scope.load = function() {
    vde.Vis.parse();

    if(vg.keys(vde.Vis._rawData).length == 0) {
      vde.Vis.data('medals', 'data/medals.json', 'json');
      vde.Vis.data('olympics', 'data/olympics.json', 'json');
      vde.Vis.data('groups', 'data/groups.json', 'json');
      vde.Vis.data('barley', 'data/barley.json', 'json');
      vde.Vis.data('iris', 'data/iris.json', 'json');
      vde.Vis.data('jobs', 'data/jobs.json', 'json');
      vde.Vis.data('stocks', 'data/stocks.csv', {"type": "csv", "parse": {"price":"number", "date":"date"}});
    }

    $timeout(function() {
      // Start with a default pipeline and group
      $rootScope.activePipeline = new vde.Vis.Pipeline();

      var g = new vde.Vis.marks.Group();
      $rootScope.activeGroup = g;
      $rootScope.activeVisual = g;
    }, 100);
  };
});

vde.App.directive('vdeMarkDroppable', function($rootScope, $timeout, logger) {
  return function(scope, element, attrs) {
    element.drop(function(e, dd) {
      var markType = $(dd.drag).attr('id');
      if(!markType) return false;

      scope.$apply(function() {
        // Add mark to model, then reparse vega spec
        var groupName = ($rootScope.activeGroup || {}).name;
        var mark = eval('new vde.Vis.marks["' + markType + '"](undefined, groupName)');
        mark.pipelineName = ($rootScope.activePipeline || {}).name;
        vde.Vis.parse();

        // Then route to this mark to load its inspector, but wait until
        // parsing/annotating is done.
        $timeout(function() { $rootScope.toggleVisual(mark); }, 100);

        logger.log('new_mark', {
          markType: markType,
          markName: mark.name,
          activeGroup: ($rootScope.activeGroup || {}).name,
          markGroup: mark.groupName
        }, true);
      });
    });
  }
})
