vde.App.directive('vdeProperty', function($rootScope, logger) {
  return {
    restrict: 'E',
    scope: {
      label: '@',
      type: '@',
      max: '@', 
      min: '@',
      step: '@',
      item: '=',
      property: '@',
      ngModel: '=',
      scale: '=',
      field: '=',
      options: '=',
      nodrop: '@',
      nochange: '@'
    },
    transclude: true,
    templateUrl: 'tmpl/inspectors/property.html',
    controller: function($scope, $element, $attrs, $timeout) { 
      $scope.onchange = function() {
        if($attrs.nochange) return;
        if('checkExtents' in $scope.item)
          $scope.item.checkExtents($scope.property);

        $timeout(function() {
          if($scope.item.update) $scope.item.update($attrs.property);
          else vde.Vis.parse();
        }, 1);   

        logger.log('onchange', {
          item: $scope.item.name,
          group: $scope.item.groupName,
          pipeline: $scope.item.pipelineName,
          property: $attrs.property,
          ngModel: $attrs.ngModel,
          value: $scope.ngModel
        });
      };

      $scope.unbind = function(property) {
        $scope.item.unbindProperty(property);
        vde.Vis.parse();

        logger.log('unbind', {
          item: $scope.item.name,
          group: $scope.item.groupName,
          pipeline: $scope.item.pipelineName,
          property: $attrs.property,
          ngModel: $attrs.ngModel
        }, true, true);
      };

      $scope.showHelper = function(target, e) {
        if(!($scope.item instanceof vde.Vis.Mark)) return;
        var width = target.width(), offset = target.offset(),
            band = width / $scope.item.items().length;

        var i = Math.floor((e.pageX - offset.left) / band);
        $scope.item.helper($attrs.property, i);
        target.css('backgroundColor', '#bbb');
      };

      $scope.hideHelper = function(target, e) {
        vde.iVis.parse(); 
        target.css('backgroundColor', 'transparent');
      };
    },
    link: function(scope, element, attrs) {
      if(attrs.nodrop) return;
      if(attrs.type == 'expr') return;

      $(element).find('.property').on('mousemove', function(e) {
        scope.showHelper($(this), e);
      })
      .on('mouseleave', function(e) { 
        scope.hideHelper($(this), e);
      }) // Clear helpers
      .drop(function(e, dd) {
        if($rootScope.activeScale && $rootScope.activeScale != scope.item) return;
        var field = $(dd.proxy).data('field') || $(dd.proxy).find('.schema').data('field') || $(dd.proxy).find('.schema').attr('field');
        var scale = $(dd.proxy).find('.scale').attr('scale');
        var pipelineName = $rootScope.activePipeline.name;

        if(scope.item.pipelineName && pipelineName != scope.item.pipelineName)
          return alert('Pipelines don\'t match');

        scope.$apply(function() {
          if(!scope.item.pipelineName && !(scope.item instanceof vde.Vis.Transform)) scope.item.pipelineName = pipelineName;

          scope.item.bindProperty(attrs.property, 
            {field: field, scaleName: scale, pipelineName: pipelineName});
        });

        $('.proxy').remove();

        vde.Vis.parse();

        logger.log('bind', {
          item: scope.item.name,
          group: scope.item.groupName,
          activePipeline: pipelineName,
          itemPipeline: scope.item.pipelineName,
          property: attrs.property,
          ngModel: attrs.ngModel,
          field: field,
          scaleName: scale
        }, true, true);
      }).drop('dropstart', function(e) {
        if($rootScope.activeScale && $rootScope.activeScale != scope.item) return;
        scope.showHelper($(this), e);
      }).drop('dropend', function(e) {
        if($rootScope.activeScale && $rootScope.activeScale != scope.item) return;
        scope.hideHelper($(this), e);
      })
    }
  }
});

vde.App.directive('vdeBinding', function($compile, $rootScope, $timeout, logger) {
  return {
    restrict: 'E',
    scope: {
      scale: '=',
      field: '=',
      draggable: '@',
    },
    templateUrl: 'tmpl/inspectors/binding.html',
    controller: function($scope, $element, $attrs) {
      // if($attrs.draggable) {
        var el = $compile("<div class=\"binding-draggable\" vde-draggable></div>")($scope);
        $element.append(el);
      // }

      $scope.editScale = function(evt) {
        var inspector = $('#binding-inspector');
        $rootScope.activeScale = inspector.is(':visible') ? null : $scope.scale;

        $timeout(function() {
          var winHeight = $(window).height(),
              pageX     = evt.pageX,
              pageY     = evt.pageY;

          inspector.css('left', (pageX-15) + 'px');
          if(pageY > winHeight / 2) { // If below half-way, position top
            inspector.css('top', (pageY - inspector.height() - 25) + 'px');
            $('.bubble', inspector).removeClass('top').addClass('bottom');          
          } else {
            inspector.css('top', (pageY + 25) + 'px');
            $('.bubble', inspector).removeClass('bottom').addClass('top');  
          }  
         
          inspector.toggle();        
        }, 100);

        logger.log('edit_scale', { activeScale: $rootScope.activeScale });
      };
    },
    link: function(scope, element, attrs) {
      // if(attrs.draggable) {
        var binding = element.find('.binding');
        element.find('.binding-draggable').append(binding);
      // }    
      $timeout(function() {
        if(scope.field instanceof vde.Vis.Field)
          element.find('.schema').data('field', scope.field);
      }, 100)
    }
  }
});

vde.App.directive('vdeExpr', function($rootScope, logger) {
  return {
    restrict: 'A',
    template: '<div class="expr" contenteditable="true"></div>',
    link: function(scope, element, attrs) {
      $(element).find('.expr')
        .html(scope.$parent.ngModel)
        .drop(function(e, dd) {
          var field = $(dd.proxy).data('field') || $(dd.proxy).find('.schema').data('field') || $(dd.proxy).find('.schema').attr('field');
          if(!field) return;

          if(scope.item instanceof vde.Vis.Transform && 
            !scope.item.requiresFork && field instanceof vde.Vis.Field) 
              scope.item.requiresFork = ($rootScope.activePipeline.name != field.pipelineName);

          $('<div class="schema" contenteditable="false">' + $(dd.proxy).text() + '</div>')
            .attr('field-spec', (field instanceof vde.Vis.Field) ? field.spec() : null)
            .toggleClass('raw',     $(dd.proxy).hasClass('raw'))
            .toggleClass('derived', $(dd.proxy).hasClass('derived'))
            .appendTo(this);

          $('.proxy').remove();
          $(this).focus();
        }).drop('dropstart', function() {
          $(this).parent().css('borderColor', '#333');
        }).drop('dropend', function() {
          $(this).parent().css('borderColor', '#aaa');
        })
        .bind('keyup', function(e) {
          var html  = $(this).html().replace('<br>','');
          var value = $('<div>' + html + '</div>');
          value.find('.schema').each(function(i, e) {
            $(e).text('d.' + $(e).attr('field-spec'));
          });

          scope.$apply(function() {
            scope.item.properties[scope.property] = value.text();
            scope.item.properties[scope.property + 'Html'] = html;
          });
        })    
    }
  }
})