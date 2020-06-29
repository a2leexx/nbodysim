"use strict"
let interval_ID = null;

let bodies = [{mass : 10000, x : 0, y : 0, vx : -(10 * 250 + 20 * 50 + 14 * 10) / 10000, vy : 0, history : []}, 
               {mass : 250, x : 0, y : 100, vx : 10, vy : 0, history : []},
               {mass : 50, x : 0, y : 25, vx : 20, vy : 0, history : []},
               {mass : 10, x : 0, y : 50, vx : 14, vy : 0, history : []}];
               
let delta_t = 0.025, t = 0;

let canvas;
let ctx;
let timeout;
let p_time;

let user_x_position = 0, user_y_position = 0;
let mouse_x = 0, mouse_y = 0;
let is_moving = false;
let scale = 1;

let selected_body;

let x_info;
let y_info;
let vx_info;
let vy_info;
let mass_info;
let object_info;

function initialize()
{
    x_info = document.getElementById('x_info');
    y_info = document.getElementById('y_info');
    vx_info = document.getElementById('vx_info');
    vy_info = document.getElementById('vy_info');
    mass_info = document.getElementById('mass_info');
    object_info = document.getElementById('object_info');

    p_time = document.getElementById('time');
    canvas = document.getElementById('bodies');
    ctx = canvas.getContext('2d');

    start_animation();
}

function start_animation()
{
    if (interval_ID !== null)
        return;
        
    interval_ID = window.setInterval(animation_frame, 1000 * delta_t);
}

function stop_animation()
{
    if (interval_ID === null)
        return;
        
    window.clearInterval(interval_ID);
    
    interval_ID = null;
}

// считает производные (для интегрирования)
function f(state)
{
    const G = 1;
    let deriv = new Array(bodies.length * 4);

    for (let i = 0; i < bodies.length; i++) {
        deriv[4 * i + 0] = state[4 * i + 2]; // vx
        deriv[4 * i + 1] = state[4 * i + 3]; // vy
        deriv[4 * i + 2] = 0;
        deriv[4 * i + 3] = 0;

        for (let j = 0; j < bodies.length; j++)
        {
            if (i === j)
                continue;

            let dx = state[4 * j + 0] - state[4 * i + 0];
            let dy = state[4 * j + 1] - state[4 * i + 1];
            
            deriv[4 * i + 2] += G * bodies[j].mass * dx * ((dx ** 2 + dy ** 2 + 1e-6) ** (-1.5));
            deriv[4 * i + 3] += G * bodies[j].mass * dy * ((dx ** 2 + dy ** 2 + 1e-6) ** (-1.5));
        }   
    }

    return deriv;
}

function runge_kutta()
{
    let state = new Array(bodies.length * 4);
    let tmp = new Array(bodies.length * 4);
    let d1, d2, d3, d4;

    for (let i = 0; i < bodies.length; i++)
    {
        state[4 * i + 0] = bodies[i].x;
        state[4 * i + 1] = bodies[i].y;
        state[4 * i + 2] = bodies[i].vx;
        state[4 * i + 3] = bodies[i].vy;  
    }
    
    d1 = f(state);

    state.forEach((v, i) => {tmp[i] = state[i] + d1[i] * delta_t / 2;});

    d2 = f(tmp);

    state.forEach((v, i) => {tmp[i] = state[i] + d2[i] * delta_t / 2;});

    d3 = f(tmp);

    state.forEach((v, i) => {tmp[i] = state[i] + d3[i] * delta_t;});

    d4 = f(tmp);

    state.forEach((v, i) => {state[i] += delta_t / 6 * (d1[i] + 2 * d2[i] + 2 * d3[i] + d4[i])});

    for (let i = 0; i < bodies.length; i++)
    {
        bodies[i].x = state[4 * i];
        bodies[i].y = state[4 * i + 1];
        bodies[i].vx = state[4 * i + 2];
        bodies[i].vy = state[4 * i + 3];
    }
}

function update_bodies_positions()
{
    for (let p of bodies) {
        p.history.unshift({ x : p.x, y : p.y});
        
        if (p.history.length > 200)
            p.history.pop();
    }

    runge_kutta();
    
    t += delta_t;
    
    p_time.innerText = 'Время: ' + t.toFixed(2) + ' сек.';
}

function animation_frame()
{
    update_bodies_positions();
    update_canvas();
}

function get_canvas_coord(px, py)
{
    let x = (px - user_x_position) * scale + canvas.width / 2;
    let y = (py - user_y_position) * scale + canvas.height / 2;

    return [x, y];
}

function get_body_canvas_radius(p)
{
    return Math.pow(p.mass, 1 / 4) * scale;
}

function update_canvas()
{
	canvas.width = canvas.clientWidth;
	
    // рисуем черный фон
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // рисуем объекты
    ctx.strokeStyle = 'rgb(0, 255, 255)';
    
    ctx.beginPath();

    for (let p of bodies) {
        const [x0, y0] = get_canvas_coord(p.x, p.y);
        ctx.moveTo(x0, y0);
        
        for (let c of p.history) {
            const [x, y] = get_canvas_coord(c.x, c.y);
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    for (let p of bodies) {
        const [x, y] = get_canvas_coord(p.x, p.y);
        const r = get_body_canvas_radius(p);

        ctx.beginPath();
        
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (selected_body === p)
            ctx.fillStyle = 'rgb(255, 255, 0)';
        else
            ctx.fillStyle = 'rgb(255, 0, 255)';
       
        ctx.fill(); 
    }

    if (selected_body !== undefined)
    {
        x_info.innerText = 'X: ' + selected_body.x.toFixed(6);
        y_info.innerText = 'Y: ' + selected_body.y.toFixed(6);
        vx_info.innerText = 'VX: ' + selected_body.vx.toFixed(6);
        vy_info.innerText = 'VY: ' + selected_body.vy.toFixed(6);
        mass_info.innerText = 'Масса: ' + selected_body.mass;
        object_info.hidden = false;
    }
    else
        object_info.hidden = true;
}

function isNumber(n)
{
    if (n.trim().length == 0)
        return false;

    return isFinite(n);
}

function add_body()
{
    let body = {};
    let errors = [];

    let x_coord = document.getElementById('x_coord').value;
    let y_coord = document.getElementById('y_coord').value;
    let x_speed = document.getElementById('x_speed').value;
    let y_speed = document.getElementById('y_speed').value;
    let mass = document.getElementById('mass').value;
    let error_alert = document.getElementById('error_alert');

    if (isNumber(x_coord))
        body.x = parseFloat(x_coord);
    else
        errors.push('X');

    if (isNumber(y_coord))
        body.y = parseFloat(y_coord);
    else
        errors.push('Y');

    if (isNumber(mass))
        body.mass = parseFloat(document.getElementById('mass').value);
    else
        errors.push('масса');

    if (isNumber(x_speed))
        body.vx = parseFloat(x_speed);
    else
        errors.push('VX');

    if (isNumber(y_speed))
        body.vy = parseFloat(y_speed);
    else
        errors.push('VY');

    if (errors.length == 0) {
        body.history = [];
        bodies.push(body);

        update_canvas();

        error_alert.hidden = true;
    }
    else {
        error_alert.hidden = false;

        error_alert.innerText = 'Некорректно задано: ' + errors.join(', ');
    }
}

function hide_g_alert()
{
	let alert_elem = document.getElementById("g_alert");
	alert_elem.hidden = true;
}

function mousemove_handler(e)
{
    if (is_moving) {
        user_x_position -= (e.offsetX - mouse_x) / scale;
        user_y_position -= (e.offsetY - mouse_y) / scale;

        mouse_x = e.offsetX;
        mouse_y = e.offsetY;

        update_canvas();
    }
}

function mousedown_handler(e)
{
    selected_body = undefined;

    for (let p of bodies)
    {
        const [x, y] = get_canvas_coord(p.x, p.y);
        const r = get_body_canvas_radius(p);

        if ((e.offsetX - x) ** 2 + (e.offsetY - y) ** 2 < r ** 2) {
            selected_body = p;
            break;
        }
    }

    is_moving = true;

    mouse_x = e.offsetX
    mouse_y = e.offsetY;

    update_canvas();
}

function mouseup_handler(e)
{
    is_moving = false;
}

function mouseout_handler(e)
{
    is_moving = false;
}

function wheel_handler(e)
{
    scale *= 2 ** (e.deltaY * 0.01);

    update_canvas();

    e.preventDefault();
}

function zoom_in()
{
    scale *= 1.5;

    update_canvas();
}

function zoom_out()
{
    scale /= 1.5;

    update_canvas();
}

function remove_all()
{
    selected_body = undefined;

    bodies.splice(0);
    
    update_canvas();
}

window.addEventListener("resize", update_canvas);

