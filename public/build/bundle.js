
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Launcher.svelte generated by Svelte v3.38.2 */
    const file$2 = "src/components/Launcher.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("S");
    			attr_dev(button, "class", button_class_value = "launcher animated-gradient " + /*showMain*/ ctx[0] + " svelte-1k70ta6");
    			add_location(button, file$2, 11, 0, 194);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleClick*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showMain*/ 1 && button_class_value !== (button_class_value = "launcher animated-gradient " + /*showMain*/ ctx[0] + " svelte-1k70ta6")) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Launcher", slots, []);
    	let { showMain } = $$props;
    	const dispatch = createEventDispatcher();

    	function handleClick() {
    		dispatch("toggleMain");
    	}

    	const writable_props = ["showMain"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Launcher> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("showMain" in $$props) $$invalidate(0, showMain = $$props.showMain);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		showMain,
    		dispatch,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("showMain" in $$props) $$invalidate(0, showMain = $$props.showMain);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showMain, handleClick];
    }

    class Launcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { showMain: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Launcher",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*showMain*/ ctx[0] === undefined && !("showMain" in props)) {
    			console.warn("<Launcher> was created without expected prop 'showMain'");
    		}
    	}

    	get showMain() {
    		throw new Error("<Launcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showMain(value) {
    		throw new Error("<Launcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/MainWindow.svelte generated by Svelte v3.38.2 */

    const file$1 = "src/components/MainWindow.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let div1_class_value;
    	let div2_class_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Some content or something idk";
    			attr_dev(div0, "class", "content svelte-5p6leh");
    			add_location(div0, file$1, 9, 4, 214);
    			attr_dev(div1, "class", div1_class_value = "inner " + /*showMain*/ ctx[0] + " svelte-5p6leh");
    			add_location(div1, file$1, 8, 2, 179);
    			attr_dev(div2, "id", "swf-main-window");
    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty(/*windowClasses*/ ctx[1].join(" ") + " " + /*showMain*/ ctx[0]) + " svelte-5p6leh"));
    			add_location(div2, file$1, 7, 0, 101);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showMain*/ 1 && div1_class_value !== (div1_class_value = "inner " + /*showMain*/ ctx[0] + " svelte-5p6leh")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (dirty & /*windowClasses, showMain*/ 3 && div2_class_value !== (div2_class_value = "" + (null_to_empty(/*windowClasses*/ ctx[1].join(" ") + " " + /*showMain*/ ctx[0]) + " svelte-5p6leh"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MainWindow", slots, []);
    	let { showMain } = $$props;
    	let { windowClasses } = $$props;
    	const writable_props = ["showMain", "windowClasses"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MainWindow> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("showMain" in $$props) $$invalidate(0, showMain = $$props.showMain);
    		if ("windowClasses" in $$props) $$invalidate(1, windowClasses = $$props.windowClasses);
    	};

    	$$self.$capture_state = () => ({ showMain, windowClasses });

    	$$self.$inject_state = $$props => {
    		if ("showMain" in $$props) $$invalidate(0, showMain = $$props.showMain);
    		if ("windowClasses" in $$props) $$invalidate(1, windowClasses = $$props.windowClasses);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showMain, windowClasses];
    }

    class MainWindow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { showMain: 0, windowClasses: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MainWindow",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*showMain*/ ctx[0] === undefined && !("showMain" in props)) {
    			console.warn("<MainWindow> was created without expected prop 'showMain'");
    		}

    		if (/*windowClasses*/ ctx[1] === undefined && !("windowClasses" in props)) {
    			console.warn("<MainWindow> was created without expected prop 'windowClasses'");
    		}
    	}

    	get showMain() {
    		return this.$$.ctx[0];
    	}

    	set showMain(showMain) {
    		this.$set({ showMain });
    		flush();
    	}

    	get windowClasses() {
    		return this.$$.ctx[1];
    	}

    	set windowClasses(windowClasses) {
    		this.$set({ windowClasses });
    		flush();
    	}
    }

    /* src/components/ChatHead.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file = "src/components/ChatHead.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let launcher;
    	let t;
    	let mainwindow;
    	let updating_windowClasses;
    	let current;
    	let mounted;
    	let dispose;

    	launcher = new Launcher({
    			props: { showMain: /*showMain*/ ctx[2] },
    			$$inline: true
    		});

    	launcher.$on("toggleMain", /*toggleMain*/ ctx[5]);

    	function mainwindow_windowClasses_binding(value) {
    		/*mainwindow_windowClasses_binding*/ ctx[9](value);
    	}

    	let mainwindow_props = { showMain: /*showMain*/ ctx[2] };

    	if (/*windowClasses*/ ctx[4] !== void 0) {
    		mainwindow_props.windowClasses = /*windowClasses*/ ctx[4];
    	}

    	mainwindow = new MainWindow({ props: mainwindow_props, $$inline: true });
    	binding_callbacks.push(() => bind(mainwindow, "windowClasses", mainwindow_windowClasses_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(launcher.$$.fragment);
    			t = space();
    			create_component(mainwindow.$$.fragment);
    			attr_dev(div, "class", "draggable svelte-j9gn74");
    			set_style(div, "right", /*right*/ ctx[0] + "px");
    			set_style(div, "bottom", /*bottom*/ ctx[1] + "px");
    			add_location(div, file, 58, 0, 1131);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(launcher, div, null);
    			append_dev(div, t);
    			mount_component(mainwindow, div, null);
    			/*div_binding*/ ctx[10](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "mouseup", /*onMouseUp*/ ctx[8], false, false, false),
    					listen_dev(window, "mousemove", /*onMouseMove*/ ctx[7], false, false, false),
    					listen_dev(div, "mousedown", /*onMouseDown*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const launcher_changes = {};
    			if (dirty & /*showMain*/ 4) launcher_changes.showMain = /*showMain*/ ctx[2];
    			launcher.$set(launcher_changes);
    			const mainwindow_changes = {};
    			if (dirty & /*showMain*/ 4) mainwindow_changes.showMain = /*showMain*/ ctx[2];

    			if (!updating_windowClasses && dirty & /*windowClasses*/ 16) {
    				updating_windowClasses = true;
    				mainwindow_changes.windowClasses = /*windowClasses*/ ctx[4];
    				add_flush_callback(() => updating_windowClasses = false);
    			}

    			mainwindow.$set(mainwindow_changes);

    			if (!current || dirty & /*right*/ 1) {
    				set_style(div, "right", /*right*/ ctx[0] + "px");
    			}

    			if (!current || dirty & /*bottom*/ 2) {
    				set_style(div, "bottom", /*bottom*/ ctx[1] + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(launcher.$$.fragment, local);
    			transition_in(mainwindow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(launcher.$$.fragment, local);
    			transition_out(mainwindow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(launcher);
    			destroy_component(mainwindow);
    			/*div_binding*/ ctx[10](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ChatHead", slots, []);
    	let showMain = false;

    	function toggleMain() {
    		$$invalidate(2, showMain = !showMain);
    	}

    	let { right = 20 } = $$props;
    	let { bottom = 20 } = $$props;
    	let moving = false;

    	function onMouseDown() {
    		moving = true;
    	}

    	function onMouseMove(e) {
    		if (moving) {
    			$$invalidate(0, right -= e.movementX);
    			$$invalidate(1, bottom -= e.movementY);
    		}
    	}

    	function onMouseUp() {
    		moving = false;
    		alignWindow();
    	}

    	let height = 400;
    	let width = 400;
    	let positionAbove = true;
    	let positionToLeft = true;
    	let main;
    	let windowClasses = ["main", "animated-gradient", "top", "left"];

    	function alignWindow() {
    		$$invalidate(4, windowClasses = ["main", "animated-gradient"]);

    		if (main.getBoundingClientRect().left + 24 < width) {
    			windowClasses.push("right");
    		} else {
    			windowClasses.push("left");
    		}

    		if (main.getBoundingClientRect().top + 24 < height) {
    			windowClasses.push("bottom");
    		} else {
    			windowClasses.push("top");
    		}

    		console.log("above?", positionAbove);
    		console.log("left?", positionToLeft);
    	}

    	
    	const writable_props = ["right", "bottom"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<ChatHead> was created with unknown prop '${key}'`);
    	});

    	function mainwindow_windowClasses_binding(value) {
    		windowClasses = value;
    		$$invalidate(4, windowClasses);
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			main = $$value;
    			$$invalidate(3, main);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("right" in $$props) $$invalidate(0, right = $$props.right);
    		if ("bottom" in $$props) $$invalidate(1, bottom = $$props.bottom);
    	};

    	$$self.$capture_state = () => ({
    		Launcher,
    		MainWindow,
    		showMain,
    		toggleMain,
    		right,
    		bottom,
    		moving,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		height,
    		width,
    		positionAbove,
    		positionToLeft,
    		main,
    		windowClasses,
    		alignWindow
    	});

    	$$self.$inject_state = $$props => {
    		if ("showMain" in $$props) $$invalidate(2, showMain = $$props.showMain);
    		if ("right" in $$props) $$invalidate(0, right = $$props.right);
    		if ("bottom" in $$props) $$invalidate(1, bottom = $$props.bottom);
    		if ("moving" in $$props) moving = $$props.moving;
    		if ("height" in $$props) height = $$props.height;
    		if ("width" in $$props) width = $$props.width;
    		if ("positionAbove" in $$props) positionAbove = $$props.positionAbove;
    		if ("positionToLeft" in $$props) positionToLeft = $$props.positionToLeft;
    		if ("main" in $$props) $$invalidate(3, main = $$props.main);
    		if ("windowClasses" in $$props) $$invalidate(4, windowClasses = $$props.windowClasses);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		right,
    		bottom,
    		showMain,
    		main,
    		windowClasses,
    		toggleMain,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		mainwindow_windowClasses_binding,
    		div_binding
    	];
    }

    class ChatHead extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { right: 0, bottom: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChatHead",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get right() {
    		throw new Error("<ChatHead>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set right(value) {
    		throw new Error("<ChatHead>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bottom() {
    		throw new Error("<ChatHead>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bottom(value) {
    		throw new Error("<ChatHead>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */

    function create_fragment(ctx) {
    	let chathead;
    	let current;
    	chathead = new ChatHead({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(chathead.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(chathead, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chathead.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chathead.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(chathead, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ChatHead });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
