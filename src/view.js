/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_|
*    @author lo.th / http://lo-th.github.io/labs/
*    THREE ultimate manager
*/

'use strict';
// MATH ADD
Math.torad = 0.0174532925199432957;
Math.todeg = 57.295779513082320876;
Math.degtorad = 0.0174532925199432957;
Math.radtodeg = 57.295779513082320876;
Math.Pi = 3.141592653589793;
Math.TwoPI = 6.283185307179586;
Math.PI90 = 1.570796326794896;
Math.PI270 = 4.712388980384689;
Math.lerp = function (a, b, percent) { return a + (b - a) * percent; };
Math.rand = function (a, b) { return Math.lerp(a, b, Math.random()); };
Math.randInt = function (a, b, n) { return Math.lerp(a, b, Math.random()).toFixed(n || 0)*1; };
Math.int = function(x) { return ~~x; };

var view = ( function () {

'use strict';

var _V;

var time = 0;
var temp = 0;
var count = 0;
var fps = 0;

var canvas, renderer, scene, camera, controls, debug;
var ray, mouse, content, targetMouse, rayCallBack, moveplane, isWithRay = false;;
var vs = { w:1, h:1, l:0, x:0 };

var helper;

var meshs = [];
var statics = [];
var terrains = [];
var softs = [];
var cars = [];
var heros = [];
var extraGeo = [];

var byName = {};

var isNeedUpdate = false;
var isNeedCrowdUpdate = false;

// camera
var isCamFollow = false;
var currentFollow = null;
var cameraGroup;

//var azimut = 0, oldAzimut = 0;
//var polar = 0, oldPolar = 0;

var cam = { theta:0, phi:0, oTheta:0, oPhi:0 };

var geo, mat;

var urls = [];
var callback_load = null;
//var seaLoader = null;
var results = {};



var imagesLoader;
//var currentCar = -1;

var isWithShadow = false;
var shadowGround, light, ambient;
var spy = -0.01;

var perlin = null;

var environment, envcontext, nEnv = 1, isWirframe = true;
var envLists = [ 'wireframe','ceramic','plastic','smooth','metal','chrome','brush','black','glow','red','sky' ];
var envMap;


view = {

    //--------------------------------------
    //
    //   LOOP
    //
    //--------------------------------------

    render: function () {

        requestAnimationFrame( _V.render );

        TWEEN.update();
        THREE.SEA3D.AnimationHandler.update( 0.017 );

        update();

        if( isNeedUpdate ){

            _V.bodyStep();
            _V.heroStep();
            _V.carsStep();
            _V.softStep();

            _V.controlUpdate();

            isNeedUpdate = false;

        }

        postUpdate();

        renderer.render( scene, camera );

        time = now();
        if ( (time - 1000) > temp ){ temp = time; fps = count; count = 0; }; count++;

    },

    needUpdate: function (){ isNeedUpdate = true; },
    needCrowdUpdate: function (){ isNeedCrowdUpdate = true; },


    //--------------------------------------
    //
    //   RESET
    //
    //--------------------------------------

    reset: function () {

        this.removeRay();
        this.resetCamera();
        this.setShadowPosY(-0.01);
        helper.visible = true;

        var c, i;

        while( meshs.length > 0 ) scene.remove( meshs.pop() );
        while( statics.length > 0 ) scene.remove( statics.pop() );
        while( terrains.length > 0 ) scene.remove( terrains.pop() );
        while( softs.length > 0 ) scene.remove( softs.pop() );
        while( heros.length > 0 ) scene.remove( heros.pop() );
        while( extraGeo.length > 0 ) extraGeo.pop().dispose();
        
        while( cars.length > 0 ){
            c = cars.pop();
            if( c.userData.helper ){
                c.remove( c.userData.helper );
                c.userData.helper.dispose();
            }
            i = c.userData.w.length;
            while( i-- ){
                scene.remove( c.userData.w[i] );
            }
            scene.remove( c );
        }

        //meshs.length = 0;
        perlin = null;
        byName = {};

        postUpdate = function () {};
        update = function () {};

    },

    init: function ( callback ) {

        canvas = document.createElement("canvas");
        canvas.className = 'canvas3d';
        canvas.oncontextmenu = function(e){ e.preventDefault(); };
        canvas.ondrop = function(e) { e.preventDefault(); };
        document.body.appendChild( canvas );


        _V = this;



        // RENDERER

        try {
            renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true, alpha:false });
            //renderer = new THREE.WebGLRenderer({ canvas:canvas, precision:"mediump", antialias:true, alpha:false });
        } catch( error ) {
            if(intro !== null ) intro.message('<p>Sorry, your browser does not support WebGL.</p>'
                        + '<p>This application uses WebGL to quickly draw'
                        + ' AMMO Physics.</p>'
                        + '<p>AMMO Physics can be used without WebGL, but unfortunately'
                        + ' this application cannot.</p>'
                        + '<p>Have a great day!</p>');
            return;
        }

        if( intro !== null ) intro.clear();

        renderer.setClearColor(0x242424, 1);
        renderer.setPixelRatio( window.devicePixelRatio );

        // TONE MAPPING

        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        renderer.toneMapping = THREE.Uncharted2ToneMapping;
        renderer.toneMappingExposure = 3.0;
        renderer.toneMappingWhitePoint = 5.0;

        // SCENE

        scene = new THREE.Scene();

        content = new THREE.Group();
        scene.add( content );

        // CAMERA / CONTROLER

        camera = new THREE.PerspectiveCamera( 60 , 1 , 1, 1000 );
        camera.position.set( 0, 0, 30 );

        controls = new THREE.OrbitControls( camera, canvas );
        controls.target.set( 0, 0, 0 );
        controls.enableKeys = false;
        controls.update();

        cameraGroup = new THREE.Group();
        scene.add( cameraGroup );
        cameraGroup.add( camera );

        // LIGHTS

        this.addLights();

        // IMAGE LOADER

        imagesLoader = new THREE.TextureLoader();

        // RAYCAST

        ray = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // GEOMETRY

        geo = {

            box:      new THREE.BoxBufferGeometry(1,1,1),
            hardbox:  new THREE.BoxBufferGeometry(1,1,1),
            cone:     new THREE.CylinderBufferGeometry( 0,1,0.5 ),
            wheel:    new THREE.CylinderBufferGeometry( 1,1,1, 18 ),
            sphere:   new THREE.SphereBufferGeometry( 1, 16, 12 ),
            cylinder: new THREE.CylinderBufferGeometry( 1,1,1,12,1 ),

        }

        geo.wheel.rotateZ( -Math.PI90 );

        // MATERIAL

        mat = {

            terrain: new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, name:'terrain', wireframe:true }),
            cloth: new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, name:'cloth', wireframe:true, transparent:true, opacity:0.9, side: THREE.DoubleSide }),
            ball: new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, name:'ball', wireframe:true }),
            statique: new THREE.MeshBasicMaterial({ color:0x333399, name:'statique', wireframe:true, transparent:true, opacity:0.6 }),
            move: new THREE.MeshBasicMaterial({ color:0x999999, name:'move', wireframe:true }),
            movehigh: new THREE.MeshBasicMaterial({ color:0xff9999, name:'movehigh', wireframe:true }),
            sleep: new THREE.MeshBasicMaterial({ color:0x9999FF, name:'sleep', wireframe:true }),

            debug: new THREE.MeshBasicMaterial({ color:0x11ff11, name:'debug', wireframe:true, opacity:0.1, transparent:true }),

            hero: new THREE.MeshBasicMaterial({ color:0x993399, name:'hero', wireframe:true }),
            cars: new THREE.MeshBasicMaterial({ color:0xffffff, name:'cars', wireframe:true, transparent:true, side: THREE.DoubleSide }),
            tmp1: new THREE.MeshBasicMaterial({ color:0xffffff, name:'tmp1', wireframe:true, transparent:true }),
            tmp2: new THREE.MeshBasicMaterial({ color:0xffffff, name:'tmp2', wireframe:true, transparent:true }),
            
            meca1: new THREE.MeshBasicMaterial({ color:0xffffff, name:'meca1', wireframe:true }),
            meca2: new THREE.MeshBasicMaterial({ color:0xffffff, name:'meca2', wireframe:true }),
            meca3: new THREE.MeshBasicMaterial({ color:0xffffff, name:'meca3', wireframe:true }),

            pig: new THREE.MeshBasicMaterial({ color:0xd3a790, name:'pig', wireframe:true, transparent:false }),
            avatar: new THREE.MeshBasicMaterial({ color:0xd3a790, name:'avatar', wireframe:true, transparent:false }),

            both: new THREE.MeshBasicMaterial({ color:0xffffff, name:'both', wireframe:true, side:THREE.DoubleSide  }),
            back: new THREE.MeshBasicMaterial({ color:0xffffff, name:'back', wireframe:true, side:THREE.BackSide  }),

        }

        // GROUND

        helper = new THREE.GridHelper( 50, 20, 0xFFFFFF, 0x333333 );
        helper.material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors, transparent:true, opacity:0.1 } );
        scene.add( helper );

        this.resize();
        this.initEnv();



        

        

        window.addEventListener( 'resize', _V.resize, false );

        this.render();

        this.load ( 'basic', callback );

        //if( callback ) callback();

    },

    addLights: function(){

        light = new THREE.DirectionalLight( 0xffffff, 1 );
        light.position.set( -3, 50, 5 );
        light.lookAt( new THREE.Vector3() );
        scene.add( light );

        ambient = new THREE.AmbientLight( 0x444444 );
        scene.add( ambient );

    },

    resize: function () {

        vs.h = window.innerHeight;
        vs.w = window.innerWidth - vs.x;

        canvas.style.left = vs.x +'px';
        camera.aspect = vs.w / vs.h;
        camera.updateProjectionMatrix();
        renderer.setSize( vs.w, vs.h );

        if( editor ) editor.resizeMenu( vs.w );

    },

    setLeft: function ( x ) { 

        vs.x = x; 

    },

    getFps: function () {

        return fps;

    },

    getInfo: function () {

        return renderer.info.programs.length;

    },

    

    addMap: function( name, matName ) {

        var map = imagesLoader.load( './assets/textures/' + name );
        //map.wrapS = THREE.RepeatWrapping;
        //map.wrapT = THREE.RepeatWrapping;
        map.flipY = false;
        mat[matName].map = map;

    },

    getGeo: function () {

        return geo;

    },

    getMat: function () {

        return mat;

    },

    getScene: function () {

        return scene;

    },

    // RAYCAST

    removeRay: function(){
        if(isWithRay){
            isWithRay = false;

            canvas.removeEventListener( 'mousemove', _V.rayTest, false );
            rayCallBack = null;

            content.remove(moveplane);
            scene.remove(targetMouse);

        }
    },

    activeRay: function ( callback ) {

        isWithRay = true;

        var g = new THREE.PlaneBufferGeometry(100,100);
        g.rotateX( -Math.PI90 );
        moveplane = new THREE.Mesh( g,  new THREE.MeshBasicMaterial({ color:0xFFFFFF, transparent:true, opacity:0 }));
        content.add(moveplane);
        //moveplane.visible = false;

        targetMouse = new THREE.Mesh( geo['box'] ,  new THREE.MeshBasicMaterial({color:0xFF0000}));
        scene.add(targetMouse);

        canvas.addEventListener( 'mousemove', _V.rayTest, false );

        rayCallBack = callback;

    },

    rayTest: function (e) {

        mouse.x = ( (e.clientX- vs.x )/ vs.w ) * 2 - 1;
        mouse.y = - ( e.clientY / vs.h ) * 2 + 1;

        ray.setFromCamera( mouse, camera );
        var intersects = ray.intersectObjects( content.children, true );
        if ( intersects.length) {
            targetMouse.position.copy( intersects[0].point )
            //paddel.position.copy( intersects[0].point.add(new THREE.Vector3( 0, 20, 0 )) );

            rayCallBack( targetMouse );
        }
    },

    // MATERIAL

    changeMaterial: function ( type ) {

        var m, matType, name, i, j, k;

        if( type === 0 ) {
            isWirframe = true;
            matType = 'MeshBasicMaterial';
            this.removeShadow();
        }else{
            isWirframe = false;
            matType = 'MeshStandardMaterial';
            this.addShadow();
        }

        // create new material

        for( var old in mat ) {

            m = mat[ old ];
            name = m.name;
            if(name!=='debug'){


                mat[ name ] = new THREE[ matType ]({ 
                    name:name, 
                    envMap:null,
                    map:m.map || null, 
                    vertexColors:m.vertexColors || false, 
                    color: m.color === undefined ? 0xFFFFFF : m.color.getHex(),
                    wireframe:isWirframe, 
                    transparent: m.transparent || false, 
                    opacity: m.opacity || 1, 
                    side: m.side || THREE.FrontSide 
                });
                if( !isWirframe ){
                    mat[name].envMap = envMap;
                    mat[name].metalness = 0.6;
                    mat[name].roughness = 0.4;
                }

                m.dispose();
            }

        }

        // re-apply material

        i = meshs.length;
        while(i--){
            name = meshs[i].material.name;
            meshs[i].material = mat[name];
        };

        i = statics.length;
        while(i--){
            name = statics[i].material.name;
            statics[i].material = mat[name];
        };

        i = cars.length;
        while(i--){
            if(cars[i].material == undefined){
                k = cars[i].children.length;
                while(k--){
                    name = cars[i].children[k].material.name;
                    if( name !=='helper') cars[i].children[k].material = mat[name]
                }
            }else{
                name = cars[i].material.name;
                cars[i].material = mat[name];
            }
            
            j = cars[i].userData.w.length;
            while(j--){
                name = cars[i].userData.w[j].material.name;
                cars[i].userData.w[j].material = mat[name];
            }
        };

        i = terrains.length;
        while(i--){
            name = terrains[i].material.name;
            terrains[i].material = mat[name];
        };

        i = softs.length;
        while(i--){
            if(softs.softType!==2){
                name = softs[i].material.name;
                softs[i].material = mat[name];
            }
            
        };

    },

    needFocus: function () {

        canvas.addEventListener('mouseover', editor.unFocus, false );

    },

    haveFocus: function () {

        canvas.removeEventListener('mouseover', editor.unFocus, false );

    },

    // ENVMAP

    initEnv: function () {

        var env = document.createElement( 'div' );
        env.className = 'env';
        var canvas = document.createElement( 'canvas' );
        canvas.width = canvas.height = 64;
        env.appendChild( canvas );
        document.body.appendChild( env );
        envcontext = canvas.getContext('2d');
        env.onclick = this.loadEnv;
        env.oncontextmenu = this.loadEnv;
        this.loadEnv();

    },

    loadEnv: function ( e ) {

        var b = 0;

        if(e){ 
            e.preventDefault();
            b = e.button;
            if( b === 0 ) nEnv++;
            else nEnv--;
            if( nEnv == envLists.length ) nEnv = 0;
            if( nEnv < 0 ) nEnv = envLists.length-1;
        }

        var img = new Image();
        img.onload = function(){
            
            envcontext.drawImage(img,0,0,64,64);
            
            envMap = new THREE.Texture( img );
            envMap.mapping = THREE.SphericalReflectionMapping;
            envMap.format = THREE.RGBFormat;
            envMap.needsUpdate = true;

            if( nEnv === 0 && !isWirframe ) _V.changeMaterial( 0 );
            if( nEnv !== 0  ) {
                if( isWirframe ) _V.changeMaterial( 1 );
                else{
                    for( var mm in mat ){
                       mat[mm].envMap = envMap;
                    }
                }
            }
        }

        img.src = './assets/textures/spherical/'+ envLists[nEnv] +'.jpg';

    },

    // GRID

    hideGrid: function(){

        if( helper.visible ) helper.visible = false;
        else helper.visible = true;

    },

    //--------------------------------------
    //
    //   LOAD SEA3D
    //
    //--------------------------------------

    load: function( Urls, Callback ){

        if ( typeof Urls == 'string' || Urls instanceof String ) urls.push( Urls );
        else urls = urls.concat( Urls );

        callback_load = Callback || function(){};

        _V.load_sea( urls[0] );

    },

    load_next: function () {

        urls.shift();
        if( urls.length === 0 ) callback_load();
        else _V.load_sea( urls[0] );

    },

    load_sea: function ( n ) {

        var l = new THREE.SEA3D();

        l.onComplete = function( e ) {

            results[ n ] = l.meshes;

            var i = l.geometries.length, g;
            while( i-- ){
                g = l.geometries[i];
                geo[ g.name ] = g;
            };

            _V.load_next();

        };

        l.load( './assets/models/'+ n +'.sea' );

    },

    getResult : function(){

        return results;

    },

    //--------------------------------------
    //
    //   SRC UTILS ViewUtils
    //
    //--------------------------------------


    mergeMesh: function(m){

        return THREE.ViewUtils.mergeGeometryArray( m );

    },

    prepaGeometry: function ( g, type ) {

        return THREE.ViewUtils.prepaGeometry( g, type );

    },


    //--------------------------------------
    //
    //   CAMERA AND CONTROL
    //
    //--------------------------------------

    controlUpdate: function(){

        

        if( !isCamFollow ) return;
        if( currentFollow === null ) return;

        var h, v;
        var mesh = currentFollow;
        var type = mesh.userData.type;
        var speed = mesh.userData.speed;

        v = (-70) * Math.torad;

        if( type === 'car' ) {

            
            
            if( speed < 10 && speed > -10 ){ 

                this.setControle( true );
                return;

            } else {

                this.setControle( false );

            }
        }



        if( type === 'hero' ){

            //if( speed === 0 ){
                this.setControle( true );

                cam.theta = controls.getAzimuthalAngle() + Math.Pi;
                cam.phi = -controls.getPolarAngle();// - Math.PI90;



                if( cam.phi !== cam.oPhi ) {
                    cam.oPhi = cam.phi;
                    v = cam.phi;
                }
                if( cam.theta !== cam.oTheta ) {
                    cam.oTheta = cam.theta;
                    ammo.send('heroRotation', { id:mesh.userData.id, angle:cam.theta })
                }

                // - (90*Math.torad);
                //return;
           // }

        }

        //console.log(cam.phi*Math.todeg)

        //view.setControle( false );

        var matrix = new THREE.Matrix4();
        matrix.extractRotation( mesh.matrix );

        var front = new THREE.Vector3( 0, 0, 1 );
        front.applyMatrix4( matrix );
        //matrix.multiplyVector3( front );

        var target = mesh.position;
        h = Math.atan2( front.x, front.z );// * Math.radtodeg ) - 180;
        //v = (20-90) * Math.torad;


        this.autoCamera( h, v, 10, 0.3, target );

        //if( type === 'car' ) 
        //else view.setTarget(target);

    },

    setFollow: function ( name ) {

        currentFollow = this.getByName( name );
        if( currentFollow !== null ) {
            isCamFollow = true;
        }

    },

    setTarget: function ( target ) {

        controls.target.copy( target );
        controls.update();

    },

    autoCamera:function ( h, v, d, l, target ) {

        l = l || 1;
        //if( target ) controls.target.set( target.x || 0, target.y || 0, target.z || 0 );
        //camera.position.copy( this.orbit( h, v, d ) );
        camera.position.lerp( this.orbit( h, v, d ), l );

        if( target ) this.setTarget( target );
        //controls.update();

    },

    moveCamera: function ( h, v, d, target ) {

        /*l = l || 1;
       // if( target ) controls.target.set( target.x || 0, target.y || 0, target.z || 0 );
        camera.position.lerp( this.orbit( (h+180) * Math.torad, (v-90) * Math.torad, d ), l );
        //controls.update();



        if( target ) this.setTarget( target );*/

        var dest = this.orbit( (h+180) * Math.torad, (v-90) * Math.torad, d );


        new TWEEN.Tween( camera.position ).to( { x: dest.x, y: dest.y, z: dest.z }, 400 )
                    .easing( TWEEN.Easing.Quadratic.Out )
                    //.onUpdate( function(){ isMove = true; } )
                    //.onComplete( function(){ current = rubrique; isMove = false; } )
                    .start();


        new TWEEN.Tween( controls.target ).to( { x: target[0], y: target[1], z: target[2] }, 400 )
                    .easing( TWEEN.Easing.Quadratic.Out )
                    .onUpdate( function(){ controls.update(); } )
                    //.onComplete( function(){ current = rubrique; isMove = false; } )
                    .start();
        
    },

    orbit: function( h, v, d ) {

        var offset = new THREE.Vector3();
        
        var phi = v;
        var theta = h;
        offset.x =  d * Math.sin(phi) * Math.sin(theta);
        offset.y =  d * Math.cos(phi);
        offset.z =  d * Math.sin(phi) * Math.cos(theta);

        var p = new THREE.Vector3();
        p.copy( controls.target ).add( offset );
        /*
        p.x = ( d * Math.sin(phi) * Math.cos(theta)) + controls.target.x;
        p.y = ( d * Math.cos(phi)) + controls.target.y;
        p.z = ( d * Math.sin(phi) * Math.sin(theta)) + controls.target.z;*/

        //key[8] = theta;
        
        return p;

    },

    setControle: function( b ){

        if( controls.enableRotate === b ) return;
        
        controls.enableRotate = b;
        controls.enableZoom = b;
        controls.enablePan = b;

    },



    resetCamera: function(){

        _V.setControle( true );
        currentFollow = null;

    },

    setDriveCar: function ( name ) {

        ammo.send('setDriveCar', { n:this.getByName(name).userData.id });

    },

    toRad: function ( r ) {

        var i = r.length;
        while(i--) r[i] *= Math.torad;
        return r;

    },



    //--------------------------------------
    //
    //   ADD
    //
    //--------------------------------------

    add: function ( o ) {

        var isCustomGeometry = false;

        o.mass = o.mass == undefined ? 0 : o.mass;
        o.type = o.type == undefined ? 'box' : o.type;

        // position
        o.pos = o.pos == undefined ? [0,0,0] : o.pos;

        // size
        o.size = o.size == undefined ? [1,1,1] : o.size;
        if(o.size.length == 1){ o.size[1] = o.size[0]; }
        if(o.size.length == 2){ o.size[2] = o.size[0]; }

        if(o.geoSize){
            if(o.geoSize.length == 1){ o.geoSize[1] = o.geoSize[0]; }
            if(o.geoSize.length == 2){ o.geoSize[2] = o.geoSize[0]; }
        }

        // rotation is in degree
        o.rot = o.rot == undefined ? [0,0,0] : this.toRad(o.rot);
        o.quat = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( o.rot ) ).toArray();

        if(o.rotA) o.quatA = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( this.toRad( o.rotA ) ) ).toArray();
        if(o.rotB) o.quatB = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( this.toRad( o.rotB ) ) ).toArray();

        if(o.angUpper) o.angUpper = this.toRad( o.angUpper );
        if(o.angLower) o.angLower = this.toRad( o.angLower );

        var mesh = null;

        if(o.type.substring(0,5) === 'joint') {

            ammo.send( 'add', o );
            return;

        }

        if(o.type === 'plane'){
            helper.position.set( o.pos[0], o.pos[1], o.pos[2] )
            ammo.send( 'add', o ); 
            return;
        }

        if(o.type === 'softTriMesh'){
            this.softTriMesh( o ); 
            return;
        }

        if(o.type === 'softConvex'){
            this.softConvex( o ); 
            return;
        }

        if(o.type === 'cloth'){
            this.cloth( o ); 
            return;
        }

        if(o.type === 'rope'){
            this.rope( o ); 
            return;
        }

        if(o.type === 'ellipsoid'){
            this.ellipsoid( o ); 
            return;
        }

        if(o.type === 'terrain'){
            this.terrain( o ); 
            return;
        }

        
        

        var material;
        if(o.material !== undefined) material = mat[o.material];
        else material = o.mass ? mat.move : mat.statique;
        
        if( o.type === 'capsule' ){
            var g = new THREE.CapsuleBufferGeometry( o.size[0] , o.size[1]*0.5 );
            //g.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI*0.5));
            mesh = new THREE.Mesh( g, material );
            extraGeo.push(mesh.geometry);
            isCustomGeometry = true;

        } else if( o.type === 'mesh' || o.type === 'convex' ){ 
            o.v = _V.prepaGeometry( o.shape, o.type );
            if(o.geometry){
                mesh = new THREE.Mesh( o.geometry, material );
                extraGeo.push(o.geometry);
                extraGeo.push(o.shape);
            } else {
                mesh = new THREE.Mesh( o.shape, material );
                extraGeo.push(mesh.geometry);
            }
        } else {
            if(o.geometry){
                if(o.geoRot || o.geoScale) o.geometry = o.geometry.clone();
                // rotation only geometry
                if(o.geoRot){ o.geometry.applyMatrix(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler().fromArray(this.toRad(o.geoRot))));}

            
                // scale only geometry
                if(o.geoScale){ 
                    o.geometry.applyMatrix( new THREE.Matrix4().makeScale( o.geoScale[0], o.geoScale[1], o.geoScale[2] ) );
                    //material = mat['back'];//material.clone();
                    //material.side = THREE.BackSide;
                }
            }

            if(o.mass === 0 && o.type === 'box' ) mesh = new THREE.Mesh( o.geometry || geo['hardbox'], material );
            else mesh = new THREE.Mesh( o.geometry || geo[o.type], material );

            if( o.geometry ){
                extraGeo.push(o.geometry);
                if(o.geoSize) mesh.scale.fromArray( o.geoSize );
                if(!o.geoSize && o.size) mesh.scale.fromArray( o.size );
                isCustomGeometry = true;
            }

        }


        if(mesh){

            if( !isCustomGeometry ) mesh.scale.fromArray( o.size );

            mesh.position.fromArray( o.pos );
            mesh.quaternion.fromArray( o.quat );

            mesh.receiveShadow = true;
            mesh.castShadow = true;
            
            this.setName( o, mesh );

            scene.add( mesh );

            // push 
            if( o.mass ) meshs.push( mesh );
            else statics.push( mesh );
        }

        if( o.shape ) delete( o.shape );
        if( o.geometry ) delete( o.geometry );
        if( o.material ) delete( o.material );

        // send to worker
        ammo.send( 'add', o );

    },

    

    getGeoByName: function ( name, Buffer ) {

        var g;
        var i = geo.length;
        var buffer = Buffer || false;
        while(i--){
            if( name == geo[i].name) g = geo[i];
        }
        if( buffer ) g = new THREE.BufferGeometry().fromGeometry( g );
        return g;

    },

    character: function ( o ) {

        o.size = o.size == undefined ? [0.25,2,2] : o.size;
        if(o.size.length == 1){ o.size[1] = o.size[0]; }
        if(o.size.length == 2){ o.size[2] = o.size[0]; }

        o.pos = o.pos === undefined ? [0,0,0] : o.pos;
        o.rot = o.rot == undefined ? [0,0,0] : this.toRad( o.rot );
        o.quat = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( o.rot ) ).toArray();

        var g = new THREE.CapsuleBufferGeometry( o.size[0], o.size[1]*0.5, 6 );

        var mesh = new THREE.Group();//o.mesh || new THREE.Mesh( g );

        if( o.debug ){
            var mm = new THREE.Mesh( g, mat.debug );
            extraGeo.push( g );
            mesh.add( mm )


        }

        //mesh.material = mat.hero;
        if( o.mesh ){

            mat.hero.skinning = true;
            //mesh.userData.skin = true;

            o.mesh.material = mat.hero;
            o.mesh.scale.multiplyScalar( o.scale || 1 );
            o.mesh.position.set(0,0,0);
            o.mesh.play(0);

            mesh.add( o.mesh );
            mesh.skin = o.mesh;

            extraGeo.push( mesh.skin.geometry );
            
        } else {

            var mx = new THREE.Mesh( g, mat.hero );
            extraGeo.push( g );
            mesh.add( mx );

        }
        


        

        mesh.userData.speed = 0;
        mesh.userData.type = 'hero';
        mesh.userData.id = heros.length;

         // copy rotation quaternion
        mesh.position.fromArray( o.pos );
        mesh.quaternion.fromArray( o.quat );

        

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add( mesh );
        heros.push( mesh );

        this.setName( o, mesh );

        if( o.mesh ) delete( o.mesh );

        // send to worker
        ammo.send( 'character', o );

    },

    vehicle: function ( o ) {

        //var type = o.type || 'box';
        var size = o.size || [2,0.5,4];
        var pos = o.pos || [0,0,0];
        var rot = o.rot || [0,0,0];

        var wPos = o.wPos || [1, 0, 1.6];

        var massCenter = o.massCenter || [0,0.25,0];

        this.toRad( rot );

        // chassis
        var mesh;
        if( o.mesh ){ 
            mesh = o.mesh;
            var k = mesh.children.length;
                while(k--){
                    mesh.children[k].position.set( massCenter[0], massCenter[1], massCenter[2] );
                    //mesh.children[k].geometry.translate( massCenter[0], massCenter[1], massCenter[2] );
                    mesh.children[k].castShadow = true;
                    mesh.children[k].receiveShadow = true;
                }
        } else {
            var g = new THREE.BufferGeometry().fromGeometry( new THREE.BoxGeometry(size[0], size[1], size[2]) );//geo.box;
            g.translate( massCenter[0], massCenter[1], massCenter[2] );
            extraGeo.push( g );
            mesh = new THREE.Mesh( g, mat.move );
        } 
        

        //mesh.scale.set( size[0], size[1], size[2] );
        mesh.position.set( pos[0], pos[1], pos[2] );
        mesh.rotation.set( rot[0], rot[1], rot[2] );

        // copy rotation quaternion
        o.quat = mesh.quaternion.toArray();

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        

        scene.add( mesh );

        this.setName( o, mesh );

        mesh.userData.speed = 0;
        mesh.userData.steering = 0;
        mesh.userData.NumWheels = o.nw || 4;
        mesh.userData.type = 'car';

        if(o.helper){
            mesh.userData.helper = new THREE.CarHelper( wPos );
            mesh.add( mesh.userData.helper );
        }

        // wheels

        var radius = o.radius || 0.4;
        var deep = o.deep || 0.3;
        wPos = o.wPos || [1, -0.25, 1.6];

        var w = [];

        var needScale = o.wheel == undefined ? true : false;

        var gw = o.wheel || geo['wheel'];
        var gwr = gw.clone();
        gwr.rotateY( Math.Pi );
        extraGeo.push( gwr );

        var i = o.nw || 4;
        while(i--){
            if(i==1 || i==2) w[i] = new THREE.Mesh( gw, mat.move );
            else w[i] = new THREE.Mesh( gwr, mat.move );
            if( needScale ) w[i].scale.set( deep, radius, radius );
            else w[i].material = mat.cars;

            w[i].castShadow = true;
            w[i].receiveShadow = true;

            scene.add( w[i] );
        }

        mesh.userData.w = w;

        //var car = { body:mesh, w:w, axe:helper.mesh, nw:o.nw || 4, helper:helper, speed:0 };

        cars.push( mesh );

        mesh.userData.id = cars.length-1;
        //carsSpeed.push( 0 );



        if( o.mesh ) o.mesh = null;
        if( o.wheel ) o.wheel = null;

        if ( o.type == 'mesh' || o.type == 'convex' ) o.v = _V.prepaGeometry( o.shape, o.type );

        if( o.shape ) delete(o.shape);
        if( o.mesh ) delete(o.mesh);

        // send to worker
        ammo.send( 'vehicle', o );

    },

    //--------------------------------------
    //   SOFT TRI MESH
    //--------------------------------------

    softTriMesh: function ( o ) {

        //console.log(o.shape)

        //if(o.shape.bones) 

        var g = o.shape.clone();
        var pos = o.pos || [0,0,0];
        var size = o.size || [1,1,1];
        var rot = o.rot || [0,0,0];

        g.translate( pos[0], pos[1], pos[2] );
        g.scale( size[0], size[1], size[2] );

        //g.rotateX( rot[0] *= Math.degtorad );
        //g.rotateY( rot[1] *= Math.degtorad );
        //g.rotateZ( rot[2] *= Math.degtorad );
        g.applyMatrix( new THREE.Matrix4().makeRotationY(rot[1] *= Math.torad ));

        
        

        //console.log('start', g.getIndex().count);

        _V.prepaGeometry( g );

        extraGeo.push( g );

        //console.log('mid', g.realIndices.length);


        o.v = g.realVertices;
        o.i = g.realIndices;
        o.ntri = g.numFaces;

        var material = o.material === undefined ? mat.cloth : mat[o.material];
        var mesh = new THREE.Mesh( g, material );

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.softType = 5;

        scene.add( mesh );
        softs.push( mesh );

        if( o.shape ) delete(o.shape);
        if( o.material ) delete(o.material);

        // send to worker
        ammo.send( 'add', o );
        
    },

    //--------------------------------------
    //   SOFT CONVEX
    //--------------------------------------

    softConvex: function ( o ) {

        var g = o.shape;
        var pos = o.pos || [0,0,0];

        g.translate( pos[0], pos[1], pos[2] );

        _V.prepaGeometry(g);

        o.v = g.realVertices;

        var mesh = new THREE.Mesh( g, mat.cloth );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.softType = 4;

        scene.add( mesh );
        softs.push( mesh );

        // send to worker
        ammo.send( 'add', o );

    },

    //--------------------------------------
    //   CLOTH
    //--------------------------------------

    cloth: function ( o ) {

        var i, x, y, n;

        var div = o.div || [16,16];
        var size = o.size || [100,0,100];
        var pos = o.pos || [0,0,0];

        var max = div[0] * div[1];

        var g = new THREE.PlaneBufferGeometry( size[0], size[2], div[0] - 1, div[1] - 1 );
        g.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( max*3 ), 3 ) );
        g.rotateX( -Math.PI90 );
        //g.translate( -size[0]*0.5, 0, -size[2]*0.5 );

        var numVerts = g.attributes.position.array.length / 3;

        var mesh = new THREE.Mesh( g, mat.cloth );

        this.setName( o, mesh );

       // mesh.material.needsUpdate = true;
        mesh.position.set( pos[0], pos[1], pos[2] );

        mesh.castShadow = true;
        mesh.receiveShadow = true;//true;
        //mesh.frustumCulled = false;

        mesh.softType = 1;

        scene.add( mesh );
        softs.push( mesh );

        o.size = size;
        o.div = div;
        o.pos = pos;

        // send to worker
        ammo.send( 'add', o );

    },

    //--------------------------------------
    //   ROPE
    //--------------------------------------

    rope: function ( o ) {

        //var max = o.numSegment || 10;
        //var start = o.start || [0,0,0];
        //var end = o.end || [0,10,0];

       // max += 2;
        /*var ropeIndices = [];

        //var n;
        //var pos = new Float32Array( max * 3 );
        for(var i=0; i<max-1; i++){

            ropeIndices.push( i, i + 1 );

        }*/

        if( o.numSeg === undefined ) o.numSeg = o.numSegment;

        /*var g = new THREE.BufferGeometry();
        g.setIndex( new THREE.BufferAttribute( new Uint16Array( ropeIndices ), 1 ) );
        g.addAttribute('position', new THREE.BufferAttribute( new Float32Array( max * 3 ), 3 ));
        g.addAttribute('color', new THREE.BufferAttribute( new Float32Array( max * 3 ), 3 ));

        //var mesh = new THREE.LineSegments( g, new THREE.LineBasicMaterial({ vertexColors: true }));
        var mesh = new THREE.LineSegments( g, new THREE.LineBasicMaterial({ color: 0xFFFF00 }));*/

        var g = new THREE.Tubex( o, o.numSeg || 10, o.radius || 0.2, o.numRad || 6, false );

        //console.log(g.positions.length)

        var mesh = new THREE.Mesh( g, mat.ball );

        this.setName( o, mesh );


        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.softType = 2;
        //mesh.frustumCulled = false;

        scene.add( mesh );
        softs.push( mesh );

        // send to worker
        ammo.send( 'add', o );

    },

    //--------------------------------------
    //   ELLIPSOID 
    //--------------------------------------

    ellipsoid: function ( o ) {

        // send to worker
        ammo.send( 'add', o );

    },

    ellipsoidMesh: function ( o ) {

        var max = o.lng;
        var points = [];
        var ar = o.a;
        var i, j, k, v, n;
        
        // create temp convex geometry and convert to buffergeometry
        for( i = 0; i<max; i++ ){
            n = i*3;
            points.push(new THREE.Vector3(ar[n], ar[n+1], ar[n+2]));
        }
        var gt = new THREE.ConvexGeometry( points );

        
        var indices = new Uint32Array( gt.faces.length * 3 );
        var vertices = new Float32Array( max * 3 );
        var order = new Float32Array( max );
        //var normals = new Float32Array( max * 3 );
        //var uvs  = new Float32Array( max * 2 );

        

         // get new order of vertices
        v = gt.vertices;
        i = max;
        //var v = gt.vertices;
        //var i = max, j, k;
        while(i--){
            j = max;
            while(j--){
                n = j*3;
                if(ar[n]==v[i].x && ar[n+1]==v[i].y && ar[n+2]==v[i].z) order[j] = i;
            }
        }

       
        i = max
        while(i--){
            n = i*3;
            k = order[i]*3;

            vertices[k] = ar[n];
            vertices[k+1] = ar[n+1];
            vertices[k+2] = ar[n+2];

        }

        // get indices of faces
        i = gt.faces.length;
        while(i--){
            n = i*3;
            var face = gt.faces[i];
            indices[n] = face.a;
            indices[n+1] = face.b;
            indices[n+2] = face.c;
        }

        //console.log(gtt.vertices.length)
        var g = new THREE.BufferGeometry();
        g.setIndex( new THREE.BufferAttribute( indices, 1 ) );
        g.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        g.addAttribute('color', new THREE.BufferAttribute( new Float32Array( max * 3 ), 3 ));
        g.addAttribute('order', new THREE.BufferAttribute( order, 1 ));
        
        //g.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
        //g.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );

        g.computeVertexNormals();

        extraGeo.push( g );


        gt.dispose();


        //g.addAttribute('color', new THREE.BufferAttribute( new Float32Array( max * 3 ), 3 ));
        var mesh = new THREE.Mesh( g, mat.ball );

        this.setName( o, mesh );

        mesh.softType = 3;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add( mesh );
        softs.push( mesh );

    },

    //--------------------------------------
    //
    //   TERRAIN
    //
    //--------------------------------------

    terrain: function ( o ) {

        var i, x, y, n, c;

        o.div = o.div == undefined ? [64,64] : o.div;
        o.size = o.size == undefined ? [100,10,100] : o.size;
        o.pos = o.pos == undefined ? [0,0,0] : o.pos;
        o.dpos = o.dpos == undefined ? [0,0,0] : o.dpos;
        o.complexity = o.complexity == undefined ? 30 : o.complexity;
        o.lng = o.div[0] * o.div[1];
        o.hdata =  new Float32Array( o.lng );
        
        if( !perlin ) perlin = new Perlin();

        var sc = 1 / o.complexity;
        var r = 1 / o.div[0];
        var rx = (o.div[0] - 1) / o.size[0];
        var rz = (o.div[1] - 1) / o.size[2];

        var colors = new Float32Array( o.lng * 3 );
        var g = new THREE.PlaneBufferGeometry( o.size[0], o.size[2], o.div[0] - 1, o.div[1] - 1 );
        g.rotateX( -Math.PI90 );
        var vertices = g.attributes.position.array;


        i = o.lng;
        while( i-- ){
            n = i * 3;
            x = i % o.div[0];
            y = ~~ ( i * r );
            c = 0.5 + ( perlin.noise( (x+(o.dpos[0]*rx))*sc, (y+(o.dpos[2]*rz))*sc ) * 0.5); // from 0 to 1
            o.hdata[ i ] = c * o.size[ 1 ]; // final h size
            vertices[ n + 1 ] = o.hdata[i];
            colors[ n ] = c;
            colors[ n + 1 ] = c;
            colors[ n + 2 ] = c;
        }
        
        g.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
        g.computeBoundingSphere();
        g.computeVertexNormals();

        extraGeo.push( g );
        
        var mesh = new THREE.Mesh( g, mat.terrain );
        //mesh.position.set( o.pos[0], o.pos[1], o.pos[2] );
        mesh.position.fromArray( o.pos );

        mesh.castShadow = false;
        mesh.receiveShadow = true;

        this.setName( o, mesh );

        scene.add( mesh );
        terrains.push( mesh );

        // send to worker
        ammo.send( 'add', o );

        if( shadowGround ) scene.remove( shadowGround );

    },

    moveTerrain: function ( o ) {



    },

    //--------------------------------------
    //
    //   OBJECT NAME
    //
    //--------------------------------------

    setName: function ( o, mesh ) {

        if( o.name !== undefined ){ 
            byName[o.name] = mesh;
            mesh.name = o.name;
        }

    },

    getByName: function (name){

        return byName[name] || null;

    },


    //--------------------------------------
    //
    //   UPDATE OBJECT
    //
    //--------------------------------------

    getBody: function(){ return meshs },

    bodyStep: function(){

        if( !meshs.length ) return;

        meshs.forEach( function( b, id ) {

            var n = id * 8;
            var s = Br[n];
            if ( s > 0 ) {

                if ( b.material.name == 'sleep' ) b.material = mat.move;
                if( s > 50 && b.material.name == 'move' ) b.material = mat.movehigh;
                else if( s < 50 && b.material.name == 'movehigh') b.material = mat.move;
                
                b.position.fromArray( Br, n + 1 );
                b.quaternion.fromArray( Br, n + 4 );

            } else {
                if ( b.material.name == 'move' || b.material.name == 'movehigh' ) b.material = mat.sleep;
            }
        });

    },

    heroStep: function(){

        if( !heros.length ) return;

        heros.forEach( function( b, id ) {

            var n = id * 8;
            var s = Hr[n] * 3.33;
            b.userData.speed = s * 100;
            b.position.fromArray( Hr, n + 1 );
            b.quaternion.fromArray( Hr, n + 4 );

            if(b.skin){



                if( s === 0 ) b.skin.play( 0, 0.3 );
                else{ 
                    b.skin.play( 1, 0.3 );
                    b.skin.setTimeScale( s );

                }

                //console.log(s)
                
            }

        });

    },

    carsStep: function(){

        if( !cars.length ) return;

        cars.forEach( function( b, id ) {

            var n = id * 56;
            //carsSpeed[id] = Cr[n];
            b.userData.speed = Cr[n];

            b.position.fromArray( Cr, n + 1 );
            b.quaternion.fromArray( Cr, n + 4 );

            //b.position.set( Cr[n+1], Cr[n+2], Cr[n+3] );
            //b.quaternion.set( Cr[n+4], Cr[n+5], Cr[n+6], Cr[n+7] );

            //b.axe.position.copy( b.body.position );
            //b.axe.quaternion.copy( b.body.quaternion );

            var j = b.userData.NumWheels, w;

            if(b.userData.helper){
                if( j == 4 ){
                    w = 8 * ( 4 + 1 );
                    b.userData.helper.updateSuspension(Cr[n+w+0], Cr[n+w+1], Cr[n+w+2], Cr[n+w+3]);
                }
            }
            
            while(j--){

                w = 8 * ( j + 1 );
                //if( j == 1 ) steering = a[n+w];// for drive wheel
                //if( j == 1 ) b.axe.position.x = Cr[n+w];
                //if( j == 2 ) b.axe.position.y = Cr[n+w];
                //if( j == 3 ) b.axe.position.z = Cr[n+w];

                b.userData.w[j].position.fromArray( Cr, n + w + 1 );
                b.userData.w[j].quaternion.fromArray( Cr, n + w + 4 );

                //b.userData.w[j].position.set( Cr[n+w+1], Cr[n+w+2], Cr[n+w+3] );
                //b.userData.w[j].quaternion.set( Cr[n+w+4], Cr[n+w+5], Cr[n+w+6], Cr[n+w+7] );
            }
        });

    },

    getSofts: function(){

        return softs;

    },

    softStep: function(){

        if( !softs.length ) return;

        var softPoints = 0;

        softs.forEach( function( b, id ) {

            var n, c, cc, p, j, k, u;

            var t = b.softType; // type of softBody
            var order = null;
            var isWithColor = b.geometry.attributes.color ? true : false;
            var isWithNormal = b.geometry.attributes.normal ? true : false;


            if( t === 2 ){ // rope

                j = b.geometry.positions.length;
                while( j-- ){
                    n = softPoints + ( j * 3 );
                    b.geometry.positions[j].set( Sr[n], Sr[n+1], Sr[n+2] );
                }

                b.geometry.updatePath();
                softPoints += b.geometry.positions.length*3;

            } else {

                p = b.geometry.attributes.position.array;
                if(isWithColor) c = b.geometry.attributes.color.array;

                if( t === 5 || t === 4 ){ // softTriMesh // softConvex

                    var max = b.geometry.numVertices;
                    var maxi = b.geometry.maxi;
                    var pPoint = b.geometry.pPoint;
                    var lPoint = b.geometry.lPoint;

                    j = max;
                    while(j--){
                        n = (j*3) + softPoints;
                        if( j == max-1 ) k = maxi - pPoint[j];
                        else k = pPoint[j+1] - pPoint[j];
                        var d = pPoint[j];
                        while(k--){
                            u = lPoint[d+k]*3;
                            p[u] = Sr[n];
                            p[u+1] = Sr[n+1]; 
                            p[u+2] = Sr[n+2];
                        }
                    }

                /*}else if( t === 2 ){ // new rope

                    j = b.geometry.positions.length;// * 3;
                    while(j--){
                        n = (j*3) + softPoints;
                        b.geometry.positions[j].set( Sr[n], Sr[n+1], Sr[n+2] );

                    }

                    b.geometry.updatePath();
                    softPoints += b.geometry.positions.length*3;*/

                }else{




                    if( b.geometry.attributes.order ) order = b.geometry.attributes.order.array;
                    //if( m.geometry.attributes.same ) same = m.geometry.attributes.same.array;
                    j = p.length;

                    n = 2;

                    if( order !== null ) {

                        j = order.length;
                        while(j--){
                            k = order[j] * 3;
                            n = j*3 + softPoints;
                            p[k] = Sr[n];
                            p[k+1] = Sr[n+1];
                            p[k+2] = Sr[n+2];

                            cc = Math.abs(Sr[n+1]/10);
                            c[k] = cc;
                            c[k+1] = cc;
                            c[k+2] = cc;
                        }

                    } else {
                         while(j--){
                             
                            p[j] = Sr[j+softPoints];
                            if(n==1){ 
                                cc = Math.abs(p[j]/10);
                                c[j-1] = cc;
                                c[j] = cc;
                                c[j+1] = cc;
                            }
                            n--;
                            n = n<0 ? 2 : n;
                        }

                    }

                }

                if(t!==2) b.geometry.computeVertexNormals();

                b.geometry.attributes.position.needsUpdate = true;

                if(isWithNormal){

                    var norm = b.geometry.attributes.normal.array;

                    j = max;
                    while(j--){
                        if( j == max-1 ) k = maxi - pPoint[j];
                        else k = pPoint[j+1] - pPoint[j];
                        var d = pPoint[j];
                        var ref = lPoint[d]*3;
                        while(k--){
                            u = lPoint[d+k]*3;
                            norm[u] = norm[ref];
                            norm[u+1] = norm[ref+1]; 
                            norm[u+2] = norm[ref+2];
                        }
                    }

                    b.geometry.attributes.normal.needsUpdate = true;
                }

                if(isWithColor) b.geometry.attributes.color.needsUpdate = true;
                
                b.geometry.computeBoundingSphere();

                if( t === 5 ) softPoints += b.geometry.numVertices * 3;
                else softPoints += p.length;
            }
        });

    },
    



    //--------------------------------------
    //   SHADOW
    //--------------------------------------

    removeShadow: function(){

        if(!isWithShadow) return;

        isWithShadow = false;
        renderer.shadowMap.enabled = false;
        //light.shadowMap.enabled = false;

        if( shadowGround ) scene.remove( shadowGround );
        //scene.remove(light);
        //scene.remove(ambient);

    },

    hideGroundShadow: function(){

        shadowGround.visible = false;

    },

    setShadowPosY: function( y ){

        spy = y;
        if( shadowGround ){ 
            shadowGround.position.y = spy;
            shadowGround.visible = true;
        }

    },

    addShadow: function(){

       if( isWithShadow ) return;

        isWithShadow = true;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.soft = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.renderReverseSided = false;

        if( !terrains.length ){
            var planemat = new THREE.ShaderMaterial( THREE.ShaderShadow );
            shadowGround = new THREE.Mesh( new THREE.PlaneBufferGeometry( 200, 200, 1, 1 ), planemat );
            shadowGround.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI*0.5));
            shadowGround.position.y = spy;
            shadowGround.castShadow = false;
            shadowGround.receiveShadow = true;
            scene.add( shadowGround );
        }

        light.castShadow = true;
        var d = 70;
        var camShadow = new THREE.OrthographicCamera( d, -d, d, -d,  25, 170 );
        light.shadow = new THREE.LightShadow( camShadow );

        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        //light.shadow.bias = 0.0001;


    },

}

return view;

})();