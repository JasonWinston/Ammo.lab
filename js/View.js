/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_|
*    @author lo.th / http://lo-th.github.io/labs/
*    THREE ultimate manager
*/

// MATH ADD
Math.degtorad = 0.0174532925199432957;
Math.radtodeg = 57.295779513082320876;
Math.PI = 3.141592653589793;
Math.TwoPI = 6.283185307179586;
Math.PI90 = 1.570796326794896;
Math.PI270 = 4.712388980384689;
Math.lerp = function (a, b, percent) { return a + (b - a) * percent; };
Math.rand = function (a, b) { return Math.lerp(a, b, Math.random()); };
Math.randInt = function (a, b, n) { return Math.lerp(a, b, Math.random()).toFixed(n || 0)*1; };
Math.int = function(x) { return ~~x; };

var view = ( function () {

    var canvas, renderer, scene, camera, controls;
    var vs = { w:1, h:1, l:400 };
    
    var meshs = [];
    var terrains = [];
    var cars = [];


    var geo = {};
    var mat = {};

    var extraGeo = [];

    view = function () {};

    view.init = function () {

        canvas = document.getElementById('canvas');//createElement('canvas');
        canvas.oncontextmenu = function(e){ e.preventDefault(); };
        canvas.ondrop = function(e) { e.preventDefault(); };
        //document.body.appendChild( canvas );

        camera = new THREE.PerspectiveCamera(60 , 1 , 1, 1000);
        camera.position.set(0, 0, 30);
        controls = new THREE.OrbitControls( camera, canvas );
        controls.target.set(0, 0, 0);
        controls.enableKeys = false;

        controls.update();

        try {
            renderer = new THREE.WebGLRenderer({canvas:canvas, precision:"mediump", antialias: true,  alpha: true });
        } catch( error ) {
            view.errorMsg('<p>Sorry, your browser does not support WebGL.</p>'
                        + '<p>This application uses WebGL to quickly draw'
                        + ' AMMO Physics.</p>'
                        + '<p>AMMO Physics can be used without WebGL, but unfortunately'
                        + ' this application cannot.</p>'
                        + '<p>Have a great day!</p>');
            return;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        scene = new THREE.Scene();

        geo['box'] =  new THREE.BufferGeometry().fromGeometry( new THREE.BoxGeometry(1,1,1) );
        geo['sphere'] = new THREE.SphereBufferGeometry(1);
        geo['cylinder'] =  new THREE.BufferGeometry().fromGeometry( new THREE.CylinderGeometry(1,1,1) );
        geo['cone'] =  new THREE.BufferGeometry().fromGeometry( new THREE.CylinderGeometry(0,1,0.5) );
       // geo['capsule'] =  this.capsuleGeo( 1 , 1 );
        geo['wheel'] =  new THREE.BufferGeometry().fromGeometry( new THREE.CylinderGeometry(1,1,1) );
        //geo['cylinder'].rotateZ( -Math.PI90 );
        geo['wheel'].rotateZ( -Math.PI90 );

        //w[i].rotation.z = -Math.PI90;


        //mat['statique'] = new THREE.MeshBasicMaterial({ color:0x444444, name:'statique' });
        mat['terrain'] = new THREE.MeshBasicMaterial({ vertexColors: true, name:'terrain', wireframe:true });
        mat['move'] = new THREE.MeshBasicMaterial({ color:0xFF8800, name:'move', wireframe:true });
        mat['sleep'] = new THREE.MeshBasicMaterial({ color:0x888888, name:'sleep', wireframe:true });

        var helper = new THREE.GridHelper( 200, 50 );
        helper.setColors( 0x999999, 0x999999 );
        helper.material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors, transparent:true, opacity:0.1 } );
        scene.add( helper );

        // event

        window.addEventListener( 'resize', view.resize, false );
        this.resize();

    };

    view.moveCamera = function( h, v, d, target ){

        if( target ) controls.target.set( target.x || 0, target.y || 0, target.z || 0 );
        camera.position.copy( this.orbit( h, v-90, d ) );
        controls.update();

    };

    view.orbit = function( h, v, d ) {

        var p = new THREE.Vector3();
        var phi = v * Math.degtorad;
        var theta = h * Math.degtorad;
        p.x = ( d * Math.sin(phi) * Math.cos(theta)) + controls.target.x;
        p.z = ( d * Math.sin(phi) * Math.sin(theta)) + controls.target.z;
        p.y = ( d * Math.cos(phi)) + controls.target.y;
        return p;

    };

    view.capsuleGeo = function( radius, height, SRadius, SHeight ) {

        var sRadius = SRadius || 12;
        var sHeight = SHeight || 6;
        var o0 = Math.PI * 2;
        var o1 = Math.PI * 0.5;
        var g = new THREE.Geometry();
        var m0 = new THREE.CylinderGeometry(radius, radius, height, sRadius, 1, true);
        var m1 = new THREE.SphereGeometry(radius, sRadius, sHeight, 0, o0, 0, o1);
        var m2 = new THREE.SphereGeometry(radius, sRadius, sHeight, 0, o0, o1, o1);
        var mtx0 = new THREE.Matrix4().makeTranslation(0, 0,0);
        var mtx1 = new THREE.Matrix4().makeTranslation(0, height*0.5,0);
        var mtx2 = new THREE.Matrix4().makeTranslation(0, -height*0.5,0);
        g.merge( m0, mtx0);
        g.merge( m1, mtx1);
        g.merge( m2, mtx2);
        return new THREE.BufferGeometry().fromGeometry( g );
    
    };

    view.reset = function () {

        var c, i;

        while( meshs.length > 0 ){
            scene.remove( meshs.pop() );
        }

        while( terrains.length > 0 ){ 
            scene.remove( terrains.pop() );
        }

        while( extraGeo.length > 0 ){ 
            extraGeo.pop().dispose();
        }

        while( cars.length > 0 ){
            c = cars.pop();
            scene.remove( c.body );
            i = 4;
            while(i--){
                scene.remove( c.w[i] );
            }
        }

        

    };

    view.findRotation = function ( r ) {

        if( r[0] > Math.TwoPI || r[1] > Math.TwoPI || r[2] > Math.TwoPI ){
            // is in degree
            r[0] *= Math.degtorad;
            r[1] *= Math.degtorad;
            r[2] *= Math.degtorad;

        }

        return r;

    };

    view.add = function ( o ) {

        var type = o.type || 'box';
        var mesh = null;

        if(type == 'plane'){
            ammo.send( 'add', o ); 
            return;
        }

        if(type == 'terrain'){
            this.terrain( o ); 
            return;
        }

        var size = o.size || [1,1,1];
        var pos = o.pos || [0,0,0];
        var rot = o.rot || [0,0,0];

        if(size.length == 1){ size[1] = size[0]; }
        if(size.length == 2){ size[2] = size[0]; }

        this.findRotation( rot );

        if(type == 'capsule'){
            var g = this.capsuleGeo( size[0] , size[1]*0.5 );
            extraGeo.push(g);
            mesh = new THREE.Mesh( g, mat.move );
        }
        else{ 
            mesh = new THREE.Mesh( geo[type], mat.move );
            mesh.scale.set( size[0], size[1], size[2] );
        }

        
        mesh.position.set( pos[0], pos[1], pos[2] );
        mesh.rotation.set( rot[0], rot[1], rot[2] );

        // copy rotation quaternion
        o.quat = mesh.quaternion.toArray();

        scene.add(mesh);

        // push only dynamique
        if( o.mass !== 0 ) meshs.push( mesh );

        // send to ammo worker

        ammo.send( 'add', o );

    };

    view.vehicle = function( o ) {

        var type = o.type || 'box';
        var size = o.size || [2,0.5,4];
        var pos = o.pos || [0,0,0];
        var rot = o.rot || [0,0,0];

        var massCenter = o.massCenter || [0,0.25,0];

        this.findRotation( rot );

        // chassis
        var g = new THREE.BufferGeometry().fromGeometry( new THREE.BoxGeometry(size[0], size[1], size[2]) );//geo.box;
        g.translate( massCenter[0], massCenter[1], massCenter[2] );
        extraGeo.push( g );
        var mesh = new THREE.Mesh( g, mat.move );

        //mesh.scale.set( size[0], size[1], size[2] );
        mesh.position.set( pos[0], pos[1], pos[2] );
        mesh.rotation.set( rot[0], rot[1], rot[2] );

        // copy rotation quaternion
        o.quat = mesh.quaternion.toArray();

        scene.add( mesh );

        // wheels

        var radius = o.radius || 0.4;
        var deep = o.deep || 0.3;
        var wPos = o.wPos || [1, -0.25, 1.6];

        var w = [];

        var i = 4;
        while(i--){
            w[i] = new THREE.Mesh( geo['wheel'], mat.move );
            w[i].scale.set( deep, radius, radius );

            //w[i].position.set( pos[0], pos[1], pos[2] );
            //w[i].rotation.set( rot[0], rot[1], rot[2] );
            scene.add( w[i] );
        }

        var car = { body:mesh, w:w };

        cars.push( car );

        ammo.send( 'vehicle', o );

    };

    view.terrain = function ( o ) {

        var i, x, y, n;

        var div = o.div || [64,64];
        var size = o.size || [100,10,100];
        var pos = o.pos || [0,0,0];

        var complex = o.complex || 30;

        var lng = div[0] * div[1]
        var data = new Float32Array( lng );
        var hdata =  new Float32Array( lng );
        var perlin = new Perlin();
        var sc = 1 / complex;

        i = lng;
        while(i--){
            var x = i % div[0], y = ~~ ( i / div[0] );
            data[ i ] = 0.5 + ( perlin.noise( x * sc, y * sc ) * 0.5); // 0,1
        }

        var g = new THREE.PlaneBufferGeometry( size[0], size[2], div[0] - 1, div[1] - 1 );
        g.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array(lng*3), 3 ) );
        g.rotateX( -Math.PI90 );

        extraGeo.push( g );

        var vertices = g.attributes.position.array;
        var colors = g.attributes.color.array;

        i = lng;
        while(i--){
            n = i * 3;
            hdata[i] = data[ i ] * size[1]; // final size
            vertices[ n + 1 ] = hdata[i];   // pos y
            colors[ n + 1 ] = data[ i ] * 0.5;    // green color
        }

        var mesh = new THREE.Mesh( g, mat.terrain );
        mesh.position.set( pos[0], pos[1], pos[2] );

        scene.add( mesh );
        terrains.push( mesh );

        o.hdata = hdata;
        o.size = size;
        o.div = div;
        o.pos = pos;

        ammo.send( 'add', o ); 

    };

    view.update = function(ar, dr){

        var i = meshs.length, a = ar, n, m, j, w;

        while(i--){
            m = meshs[i];
            n = i * 8;

            if ( a[n] ) {
                
                m.position.set( a[n+1], a[n+2], a[n+3] );
                m.quaternion.set( a[n+4], a[n+5], a[n+6], a[n+7] );
                if ( m.material.name == 'sleep' ) m.material = mat.move;

            } else {

                if ( m.material.name == 'move' ) m.material = mat.sleep;
            
            }

        }

        // update car
        i = cars.length;
        a = dr;

        while(i--){
            m = cars[i];
            n = i * 40;

            m.body.position.set( a[n+1], a[n+2], a[n+3] );
            m.body.quaternion.set( a[n+4], a[n+5], a[n+6], a[n+7] );

            j = 4;
            while(j--){

               w = 8 * ( j + 1 );
               m.w[j].position.set( a[n+w+1], a[n+w+2], a[n+w+3] );
               m.w[j].quaternion.set( a[n+w+4], a[n+w+5], a[n+w+6], a[n+w+7] );

            }

        }

    };

    view.setLeft = function ( x ) { vs.x = x; };

    view.errorMsg = function ( msg ) {

        var er = document.createElement('div');
        er.style.textAlign = 'center';
        er.innerHTML = msg;
        document.body.appendChild(er);

    };

    view.resize = function () {

        vs.h = window.innerHeight;
        vs.w = window.innerWidth - vs.x;

        canvas.style.left = vs.x +'px';
        camera.aspect = vs.w / vs.h;
        camera.updateProjectionMatrix();
        renderer.setSize( vs.w, vs.h );

    };

    view.render = function () {

        renderer.render( scene, camera );

    };

    return view;

})();