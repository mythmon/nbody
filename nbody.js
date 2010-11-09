if (!window.console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

TWOPI = Math.PI * 2;

canvas = null;
ctx = null;

width = null;
height = null;

bodies = new Array();

G = 1;
protoDiskSize = null;

function init() {
    console.log("init");
    canvas = $('#canvas')
    ctx = canvas[0].getContext("2d");

    width = canvas.width();
    height = canvas.height();

    ui();

    return setInterval(draw,30);
}
$(document).ready(init);

function ui() {
    // Add code for the controls
    // clear button
    $('#clear').click(function() {
        bodies.length = 0;
    });
    // protodisk
    $('#protodisk').click(function() {
        protoDisk();
    });

    // the proto disk options panel
    $('#protoOptsLink').toggle(
        function() {
            $('#protoOpts').show();
        },
        function() {
            $('#protoOpts').hide();
        }
    );
    $('#protoOpts').hide();

    $('#protoSize').slider({min:Math.min(width,height)/10, max:Math.min(width,height)/2});
    sliderLabelUpdaterSetter($('#protoSize'), $('#protoSizeLabel'));
    $('#protoSize').slider('value', Math.min(width,height)/3);

    $('#protoNum').slider({min:10, max:500});
    sliderLabelUpdaterSetter($('#protoNum'), $('#protoNumLabel'));
    $('#protoNum').slider('value', 150);
}

function sliderLabelUpdaterSetter(slider, label) {
    slider.bind( "slide", function(event, ui) {
        label.html(ui.value);
    });
    slider.bind( "slidechange", function(event, ui) {
        label.html(ui.value);
    });
}

function protoDisk() {
    var protoDiskSize = $('#protoSize').slider('value');
    var bodyCount = $('#protoNum').slider('value');

    for (var i = 0; i < bodyCount; i++) {
        var a = Math.random()*TWOPI;
        var m = Math.random() * protoDiskSize;
        var x = Math.cos(a)*m + width/2;
        var y = Math.sin(a)*m + height/2;

        a += Math.PI / 2;
        m = 5;
        var vx = Math.cos(a) * m;
        var vy = Math.sin(a) * m;
        var mass = Math.random()*1+10;
        bodies.push(new Body(x,y,vx,vy,mass));
    }
}

timestep = 0.03;
// Main loop
function draw() {
    if ($('#run:checked').val() == null) {
        return;
    }
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0,0,width,height);

    // Calculate gravity forces
    for (var i = 0; i < bodies.length - 1; i++) {
        for (var j = i + 1; j < bodies.length; j++) {
            bodies[i].doGrav(bodies[j]);
        }
    }

    // tick
    for (var i = 0; i < bodies.length; i++) {
        bodies[i].tick(timestep);
    }

    // check collisions
    for (var i = 0; i < bodies.length - 1; i++) {
        for (var j = i + 1; j < bodies.length; j++) {
            if (bodies[i].checkHit(bodies[j])) {
                // remove bodies[j]
                bodies.splice(j,1);
                // counteract the loop's increment
                j--;
            }
        }
    }

    // draw
    for (var i = 0; i < bodies.length; i++) {
        bodies[i].draw();
    }

    $('#numBodies').html("Bodies: " + bodies.length);
}

function Body(x,y,vx,vy,mass) {
    this.pos = new Vector().xy(x,y);
    this.oldpos = new Vector().xy(x-vx, y-vy);
    this.accel = new Vector().xy(0,0);

    this.oldt = 1;

    this.mass = mass;
    this.r = Math.log(mass);

    this.doGrav = function(other) {
        var dx = other.pos.x - this.pos.x;
        var dy = other.pos.y - this.pos.y;
        // we dont actually need the distance, just the square
        var distSq = dx*dx + dy*dy;
        var rSq = this.r*this.r + other.r*other.r;

        var fMag = (G*this.mass * other.mass) / distSq;
        var fVec = new Vector().xy(dx, dy);
        fVec.m = fMag;
        fVec.updateXY();

        this.accel = this.accel.add(fVec);
        other.accel = other.accel.add(fVec.times(-1));
        return;
    }

    this.checkHit = function(other) {
        var dx = other.pos.x - this.pos.x;
        var dy = other.pos.y - this.pos.y;
        // we dont actually need the distance, just the square
        var distSq = dx*dx + dy*dy;
        // check for collision
        var rSq = (this.r*this.r + other.r*other.r) * 2;

        // if hit
        if (distSq <= rSq) {
            // conserve momentum
            var newM = this.mass + other.mass;
            var thisP = this.pos.subtract(this.oldpos).times(this.mass);
            var otherP = other.pos.subtract(other.oldpos).times(other.mass);
            var newV = thisP.add(otherP).divide(newM);

            this.mass = newM;
            this.r = Math.log(newM);
            this.oldpos = this.pos.subtract(newV);
            return true;
        }
        return false;
    }

    this.tick = function(t) {
        var tcv = t / this.oldt;

        var vel = this.pos.subtract(this.oldpos).times(tcv);
        var tSq = t*t;
        if (t < 0) {
            tSq = -tSq;
        }
        var newpos = this.pos.add(vel).add(this.accel.times(tSq));

        this.oldpos = this.pos;
        this.pos = newpos;

        this.accel = new Vector();
        this.oldt = t;
    }

    this.draw = function() {
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            ctx.beginPath();
                ctx.arc(0,0,this.r,0,TWOPI,true);
            ctx.closePath();
            ctx.fill();
        ctx.restore();
    }
}

function Vector() {
    this.x = 0;
    this.y = 0;
    this.a = 0;
    this.m = 0;

    this.xy = function(x,y) {
        this.x = x;
        this.y = y;
        this.updatePolar();
        return this;
    }

    this.polar = function(m,a) {
        this.m = m;
        this.a = a;
        this.updateXY();
        return this;
    }

    this.updateXY = function() {
        this.x = this.m * Math.cos(this.a);
        this.y = this.m * Math.sin(this.a);
    }

    this.updatePolar = function() {
        this.m = Math.sqrt(this.x*this.x + this.y*this.y);
        this.a = Math.atan2(this.y,this.x);
    }

    this.add = function(v1) {
        return new Vector().xy(this.x + v1.x, this.y + v1.y);
    }

    this.subtract = function(v1) {
        return new Vector().xy(this.x - v1.x, this.y - v1.y);
    }

    this.times = function(s) {
        return new Vector().polar(this.m * s, this.a);
    }

    this.divide = function(s) {
        return new Vector().polar(this.m / s, this.a);
    }

    this.unit = function() {
        return new Vector.polar(this.a, 1);
    }

    this.dot = function(v) {
        return this.x * v.x + this.y * v.y;
    }

    // calculates a right hand normal
    this.normal = function() {
        return new Vector().xy(-this.y, this.x).unit();
    }

    this.toString = function() {
        return "(" + this.x + ", " + this.y + ")";
    }
}
