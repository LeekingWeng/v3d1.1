if(typeof Cik === 'undefined') Cik = {};

// require Cik.IO
Cik.Config = function(target){
    this.target = target;
    this.keys = [];
};

Object.assign(Cik.Config.prototype, {

    Track: function(...args){
        var keys = this.keys;
        args.forEach(key => {
            keys.push(key);
        });
    },

    Snapshot: function(ignoreKeys){
        var data = {};
        var obj = this.target;
        this.keys.forEach(key => {
            if(key instanceof Cik.Config.Controller) key = key.property;
            var keyValue = Cik.Config.getKey(obj,  key);
            if(typeof keyValue !== 'function'){
                data[key] = keyValue;
            }
            else if(ignoreKeys !== undefined){
                var warn = true;
                ignoreKeys.forEach(ignoredKey => {
                    if(ignoredKey === key){
                        warn = false;
                    }
                });
                if(warn) console.log('Config.Snapshot warning: "' + key + '" changes will be lost on', obj);
            }
        });
        return data;
    },

    Save: function(){
        this.data = this.Snapshot();
    },

    Edit: function(guiChanged, label, gui, params){

        params = Cik.Utils.AssignUndefined(params, {
            save: true, debug: true
        });

        var controllers = [];
        var target = this.target;
        if(gui === undefined) {
            gui = new dat.GUI({
                autoPlace: true
            });
        }
        else if(typeof gui === 'string'){
            if(Cik.Config.mainGui === undefined) Cik.Config.mainGui = new dat.GUI({autoPlace: false});
            gui = Cik.Config.mainGui.addFolder(gui);
        }
        else {
            gui = gui.addFolder(label);
        }

        if(this.editing === undefined) this.editing = {};

        this.keys.forEach(key => {
            var isController = key instanceof Cik.Config.Controller;
            var keyInfo = Cik.Config.KeyInfo(target, isController ? key.property : key);
            if(this.editing[keyInfo.key] !== true){
                var addFunction = keyInfo.owner[keyInfo.key].isColor ? gui.addColor : gui.add;
                controllers.push(
                    ( isController && key.min !== undefined ? 
                        addFunction.call(gui, 
                            keyInfo.owner, keyInfo.key, key.min, key.max, key.step
                        ) :
                        addFunction.call(gui, 
                            keyInfo.owner, keyInfo.key
                        )
                    ) .onChange(key.onChange === undefined ? guiChanged : 
                        (function(){
                            key.onChange.call(keyInfo.owner);
                            guiChanged();
                        })
                    )
                );
                this.editing[keyInfo.key] = true;
            }
        });

        var scope = this;
        var editor = {
            Save: function(){
                scope.Save();
                var filename = label !== undefined ? (label + (label.indexOf('.json') === -1 ? '.json' : '')) : 'config.json';
                Cik.IO.JSON(scope.data, filename);
            },

            Debug: function(){
                console.log(scope.target);
            }
        }
        if(params.save){
            if(this.defaultsFolder === undefined) this.defaultsFolder = gui.addFolder('...');
            if(this.editing['editor.Save'] !== true){
                this.defaultsFolder.add(editor, 'Save');
                this.editing['editor.Save'] = true;
            }
        }
        if(params.debug){
            if(this.defaultsFolder === undefined) this.defaultsFolder = gui.addFolder('...');
            if(this.editing['editor.Debug'] !== true){
                this.defaultsFolder.add(editor, 'Debug');
                this.editing['editor.Debug'] = true;
            }
        }

        this.gui = gui;
    },

    Bundle: function(id){
        if(id === undefined) id = 'default';
        if(Cik.Config.bundles[id] === undefined) Cik.Config.bundles[id] = [];

        var bundle = Cik.Config.bundles[id];
        if(bundle.indexOf(this) === -1) bundle.push(this);
    },

    toJSON: function(){
        if(this.data === undefined) console.warn(this.target, 'is being saved with undefined data.');
        return this.data;
    }
});

Object.assign(Cik.Config, {

    bundles: {},

    SerializeMultiple: function(labelConfigPairs){
        var data = {multiple: true};
        var labels = Object.keys(labelConfigPairs);
        labels.forEach(label => {
            data[label] = labelConfigPairs[label];
        });
        return data;
    },

    LoadMultiple: function(data, labelTargetPairs){
        var labels = Object.keys(labelTargetPairs);
        labels.forEach(label => {
            Cik.Config.Load(
                labelTargetPairs[label],
                data[label]
            );
        });
    },

    Load: function(target, data){
        var keys = Object.keys(data);
        keys.forEach(key => {
            Cik.Config.setKey(target, key, data[key]);
        });
    },

    KeyInfo: function(obj, key){
        key = key.split('.');
        while (key.length > 1) obj = obj[key.shift()];
        return {
            owner: obj,
            key: key[0]
        };
    },

    getKey: function(obj, key){
        return key.split('.').reduce(function(a, b){
            return a && a[b];
        }, obj);
    },

    setKey: function(obj, key, val){
        key = key.split('.');
        while (key.length > 1) obj = obj[key.shift()];
        return obj[key.shift()] = val;
    }
});

Cik.Config.Controller = function(property, min, max, step, onChange){
    this.property = property;
    this.min = min;
    this.max = max;
    this.step = step;
    this.onChange = onChange;
};