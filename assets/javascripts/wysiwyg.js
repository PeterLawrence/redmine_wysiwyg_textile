var TracWysiwyg = function(textarea, options) {
    var self = this;
    var editorMode = TracWysiwyg.getEditorMode();

    this.autolink = true;
    this.textarea = textarea;
    this.options = options = options || {};
    var wikitextToolbar = null;
    var textareaResizable = null;
    if (/\btrac-resizable\b/i.test(textarea.className))
    {
        var tmp = textarea.parentNode;
        tmp = tmp && tmp.parentNode;
        //if (tmp && /\btrac-resizable\b/i.test(tmp.className))
        {
            wikitextToolbar = tmp.previousSibling;
            textareaResizable = tmp;
        }
    }
    else {
        wikitextToolbar = textarea.previousSibling;
   }
    if (wikitextToolbar && (wikitextToolbar.nodeType != 1 || wikitextToolbar.className != "wikitoolbar")) {
        wikitextToolbar = null;
    }
    this.textareaResizable = textareaResizable;
    this.wikitextToolbar = wikitextToolbar;

    this.createEditable(document, textarea, textareaResizable);
    var frame = this.frame;
    var resizable = this.resizable;

    this.contentWindow = frame.contentWindow;
    this.contentDocument = this.contentWindow.document;

    this.initializeEditor(this.contentDocument);
    this.wysiwygToolbar = this.createWysiwygToolbar(document);
    this.styleMenu = this.createStyleMenu(document);
    this.decorationMenu = this.createDecorationMenu(document);
    this.tableMenu = this.createTableMenu(document);
    this.menus = [ this.styleMenu, this.decorationMenu, this.tableMenu ];
    this.toolbarButtons = this.setupMenuEvents();
    this.toggleEditorButtons = null;
    this.autolinkButton = null;
    this.savedWysiwygHTML = null;

    this.setupToggleEditorButtons();
    this.setupSyncTextAreaHeight();

    var styleStatic = { position: "static", left: "-9999px", top: "-9999px" };
    var styleAbsolute = { position: "absolute", left: "-9999px", top: "-9999px" };
    switch (editorMode) {
    case "textarea":
        TracWysiwyg.setStyle(textareaResizable || textarea, styleStatic);
        if (wikitextToolbar) {
            TracWysiwyg.setStyle(wikitextToolbar, styleStatic);
        }
        TracWysiwyg.setStyle(resizable || frame, { position: "absolute",
            left: "-9999px", top: TracWysiwyg.elementPosition(textareaResizable || textarea).top + "px" });
        TracWysiwyg.setStyle(this.wysiwygToolbar, styleAbsolute);
        TracWysiwyg.setStyle(this.autolinkButton.parentNode, { display: "none" });
        textarea.setAttribute("tabIndex", "");
        frame.setAttribute("tabIndex", "-1");
        break;
    case "wysiwyg":
        TracWysiwyg.setStyle(textareaResizable || textarea, { position: "absolute",
            left: "-9999px", top: TracWysiwyg.elementPosition(textareaResizable || textarea).top + "px" });
        if (wikitextToolbar) {
            TracWysiwyg.setStyle(wikitextToolbar, styleAbsolute);
        }
        TracWysiwyg.setStyle(resizable || frame, styleStatic);
        TracWysiwyg.setStyle(this.wysiwygToolbar, styleStatic);
        TracWysiwyg.setStyle(this.autolinkButton.parentNode, { display: "" });
        textarea.setAttribute("tabIndex", "-1");
        frame.setAttribute("tabIndex", "");
        break;
    }

    var body = document.body;
    for (var i = 0; i < this.menus.length; i++) {
        body.insertBefore(this.menus[i], body.firstChild);
    }
    var element = wikitextToolbar || textareaResizable || textarea;
    element.parentNode.insertBefore(this.toggleEditorButtons, element);
    element.parentNode.insertBefore(this.wysiwygToolbar, element);

    function lazySetup() {
        if (self.contentDocument.body) {
            var exception;
            try { self.execCommand("useCSS", false); } catch (e) { }
            try { self.execCommand("styleWithCSS", false); } catch (e) { }
            if (editorMode == "wysiwyg") {
                try { self.loadWysiwygDocument() } catch (e) { exception = e }
            }
            self.setupEditorEvents();
            self.setupFormEvent();
            if (exception) {
                (self.textareaResizable || self.textarea).style.position = "static";
                if (self.wikitextToolbar) {
                    self.wikitextToolbar.style.position = "static";
                }
                (self.resizable || self.frame).style.position = self.wysiwygToolbar.style.position = "absolute";
                self.autolinkButton.parentNode.style.display = "none";
                alert("Failed to activate the wysiwyg editor.");
                throw exception;
            }
        }
        else {
            setTimeout(lazySetup, 100);
        }
    }
    lazySetup();
};

TracWysiwyg.prototype.initializeEditor = function(d) {
    var l = window.location;
    var html = [];
    html.push(
        '<!DOCTYPE html PUBLIC',
        ' "-//W3C//DTD XHTML 1.0 Transitional//EN"',
        ' "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n',
        '<html xmlns="http://www.w3.org/1999/xhtml">',
        '<head>',
        '<base href="', l.protocol, '//', l.host, '/" />',
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />');
    var stylesheets = TracWysiwyg.tracPaths.stylesheets;
    if (!stylesheets) {
        // Work around wysiwyg stops with Agilo
        var base = TracWysiwyg.tracPaths.base.replace(/\/*$/, "/");
        stylesheets = [ base + "chrome/common/css/trac.css", base + "chrome/tracwysiwyg/editor.css" ];
    }
    var length = stylesheets.length;
    for (var i = 0; i < length; i++) {
        html.push('<link rel="stylesheet" href="' + stylesheets[i] + '" type="text/css" />');
    }
    html.push('<title></title>', '</head>', '<body></body>', '</html>');

    var first = !window.opera && d.addEventListener ? true : false;
    if (first) {
        d.designMode = "On";
    }
    d.open();
    d.write(html.join(""));
    d.close();
    if (!first) {
        d.designMode = "On";
        if (d != this.contentWindow.document) {
            this.contentDocument = this.contentWindow.document;
        }
    }
};

TracWysiwyg.prototype.toggleAutolink = function() {
    this.autolink = !this.autolink;
    this.autolinkButton.checked = this.autolink;
};

TracWysiwyg.prototype.listenerToggleAutolink = function(input) {
    var self = this;
    return function(event) {
        self.autolink = input.checked;
    };
};

TracWysiwyg.prototype.listenerToggleEditor = function(type) {
    var self = this;

    switch (type) {
    case "textarea":
        return function(event) {
            var textarea = self.textareaResizable || self.textarea;
            if (textarea.style.position == "absolute") {
                self.hideAllMenus();
                self.loadTracWikiText();
                textarea.style.position = "static";
                self.textarea.setAttribute("tabIndex", "");
                if (self.wikitextToolbar) {
                    self.wikitextToolbar.style.position = "static";
                }
                self.syncTextAreaHeight();
                (self.resizable || self.frame).style.position = self.wysiwygToolbar.style.position = "absolute";
                self.frame.setAttribute("tabIndex", "-1");
                self.autolinkButton.parentNode.style.display = "none";
                TracWysiwyg.setEditorMode(type);
            }
            self.focusTextarea();
        };
    case "wysiwyg":
        return function(event) {
            var frame = self.resizable || self.frame;
            if (frame.style.position == "absolute") {
                try {
                    self.loadWysiwygDocument();
                }
                catch (e) {
                    TracWysiwyg.stopEvent(event || window.event);
                    alert("Failed to activate the wysiwyg editor.");
                    throw e;
                }
                (self.textareaResizable || self.textarea).style.position = "absolute";
                self.textarea.setAttribute("tabIndex", "-1");
                if (self.wikitextToolbar) {
                    self.wikitextToolbar.style.position = "absolute";
                }
                frame.style.position = self.wysiwygToolbar.style.position = "static";
                self.frame.setAttribute("tabIndex", "");
                self.autolinkButton.parentNode.style.display = "";
                TracWysiwyg.setEditorMode(type);
            }
            self.focusWysiwyg();
        };
    }
};

TracWysiwyg.prototype.setupFormEvent = function() {
    var self = this;

    function listener(event) {
        var textarea = self.textareaResizable || self.textarea;
        try {
            if (textarea.style.position == "absolute") {
                var body = self.contentDocument.body;
                if (self.savedWysiwygHTML !== null && body.innerHTML != self.savedWysiwygHTML) {
                    self.textarea.value = self.domToWikitext(body, self.options);
                }
            }
        }
        catch (e) {
            TracWysiwyg.stopEvent(event || window.event);
        }
    }
    addEvent(this.textarea.form, "submit", listener);
};

TracWysiwyg.prototype.createEditable = function(d, textarea, textareaResizable) {
    var self = this;
    var getStyle = TracWysiwyg.getStyle;
    var width = TracWysiwyg.getSelfOrAncestor(textarea, "table") ? textarea.offsetWidth : "100%";
    var height = textarea.offsetHeight;
    if (!width || !height) {
        setTimeout(lazy, 100);
    }
    if (!width) {
        width = parseInt(getStyle(textarea, "fontSize"), 10) * (textarea.cols || 10) * 0.5;
    }
    if (!height) {
        height = parseInt(getStyle(textarea, "lineHeight"), 10) * (textarea.rows || 3);
    }
    var wrapper = d.createElement("div");
    wrapper.innerHTML = '<iframe class="wysiwyg" '
        + 'src="javascript:\'\'" '
        + 'width="' + width + '" height="' + height + '" '
        + 'frameborder="0" marginwidth="0" marginheight="0">'
        + '</iframe>';
    var frame = this.frame = wrapper.firstChild;

    if (textareaResizable) {
        var offset = null;
        var offsetFrame = null;
        var contentDocument = null;
        var grip = d.createElement("div");
        grip.className = "trac-grip";
        if (width != "100%" && !textarea.addEventListener) {
            grip.style.width = width + "px";
        }
        addEvent(grip, "mousedown", beginDrag);
        wrapper.appendChild(grip);
        var resizable = d.createElement("div");
        resizable.className = "trac-resizable";
        resizable.appendChild(wrapper);
        grip.style.marginLeft = (frame.offsetLeft - grip.offsetLeft) + 'px';
        grip.style.marginRight = (grip.offsetWidth - frame.offsetWidth) +'px';
        this.resizable = resizable;
        textareaResizable.parentNode.insertBefore(resizable, textareaResizable.nextSibling);
    }
    else {
        textarea.parentNode.insertBefore(frame, textarea.nextSibling);
    }

    function beginDrag(event) {
        offset = frame.height - event.pageY;
        contentDocument = self.contentDocument;
        frame.blur();
        addEvent(d, "mousemove", dragging);
        addEvent(d, "mouseup", endDrag);
        addEvent(contentDocument, "mousemove", draggingForFrame);
        addEvent(contentDocument, "mouseup", endDrag);
    }

    var topPageY = 0, framePageY = 0;
    function dragging(event) {
        var height = Math.max(32, offset + event.pageY);
        textarea.style.height = height + "px";
        frame.height = height;
    }

    function draggingForFrame(event) {
        var height = Math.max(32, event.clientY);
        textarea.style.height = height + "px";
        frame.height = height;
    }

    function endDrag(event) {
        self.focusWysiwyg();
        TracWysiwyg.removeEvent(d, "mousemove", dragging);
        TracWysiwyg.removeEvent(d, "mouseup", endDrag);
        TracWysiwyg.removeEvent(contentDocument, "mousemove", draggingForFrame);
        TracWysiwyg.removeEvent(contentDocument, "mouseup", endDrag);
    }

    function lazy() {
        var width = textarea.offsetWidth;
        var height = textarea.offsetHeight;
        if (width && height) {
            self.frame.width = width;
            self.frame.height = height;
            if (!textarea.addEventListener && textareaResizable) {
                grip.style.width = width + "px";
            }
            return;
        }
        setTimeout(lazy, 100);
    }
};

TracWysiwyg.prototype.createWysiwygToolbar = function(d) {
    var html = [
        '<ul>',
        '<li class="wysiwyg-menu-style" title="Style">',
        '<a id="wt-style" href="#">',
        '<span class="wysiwyg-menu-style">Style</span>',
        '<span class="wysiwyg-menu-paragraph">Normal</span>',
        '<span class="wysiwyg-menu-heading1">Header 1</span>',
        '<span class="wysiwyg-menu-heading2">Header 2</span>',
        '<span class="wysiwyg-menu-heading3">Header 3</span>',
        '<span class="wysiwyg-menu-heading4">Header 4</span>',
        '<span class="wysiwyg-menu-heading5">Header 5</span>',
        '<span class="wysiwyg-menu-heading6">Header 6</span>',
        '<span class="wysiwyg-menu-code">Code block</span>',
        '<span class="wysiwyg-menu-quote">Quote</span>',
        '</a></li>',
        '<li title="Bold (Ctrl+B)"><a id="wt-strong" href="#"></a></li>',
        '<li title="Italic (Ctrl+I)"><a id="wt-em" href="#"></a></li>',
        '<li title="Underline (Ctrl+U)"><a id="wt-underline" href="#"></a></li>',
        '<li title="Monospace"><a id="wt-monospace" href="#"></a></li>',
        '<li><a id="wt-decorationmenu" href="#"></a></li>',
        '<li title="Remove format"><a id="wt-remove" href="#"></a></li>',
        '<li title="Link"><a id="wt-link" href="#"></a></li>',
        '<li title="Unlink"><a id="wt-unlink" href="#"></a></li>',
        '<li title="Ordered list"><a id="wt-ol" href="#"></a></li>',
        '<li title="List"><a id="wt-ul" href="#"></a></li>',
        '<li title="Outdent"><a id="wt-outdent" href="#"></a></li>',
        '<li title="Indent"><a id="wt-indent" href="#"></a></li>',
        '<li title="Table"><a id="wt-table" href="#"></a></li>',
        '<li><a id="wt-tablemenu" href="#"></a></li>',
        '<li title="Horizontal rule"><a id="wt-hr" href="#"></a></li>',
        '<li title="Line break (Shift+Enter)"><a id="wt-br" href="#"></a></li>',
        '</ul>' ];
    var div = d.createElement("div");
    div.className = "wysiwyg-toolbar";
    div.innerHTML = html.join("").replace(/ href="#">/g, ' href="#" onmousedown="return false" tabindex="-1">');
    return div;
};

TracWysiwyg.prototype.createStyleMenu = function(d) {
    var html = [
        '<p><a id="wt-paragraph" href="#">Normal</a></p>',
        '<h1><a id="wt-heading1" href="#">Header 1</a></h1>',
        '<h2><a id="wt-heading2" href="#">Header 2</a></h2>',
        '<h3><a id="wt-heading3" href="#">Header 3</a></h3>',
        '<h4><a id="wt-heading4" href="#">Header 4</a></h4>',
        '<h5><a id="wt-heading5" href="#">Header 5</a></h5>',
        '<h6><a id="wt-heading6" href="#">Header 6</a></h6>',
        '<pre class="wiki"><a id="wt-code" href="#">Code block</a></pre>',
        '<blockquote class="citation"><a id="wt-quote" href="#">Quote</a></blockquote>' ];
    var menu = d.createElement("div");
    menu.className = "wysiwyg-menu";
    TracWysiwyg.setStyle(menu, { position: "absolute", left: "-1000px", top: "-1000px", zIndex: 1000 });
    menu.innerHTML = html.join("").replace(/ href="#">/g, ' href="#" onmousedown="return false" tabindex="-1">');
    return menu;
};

TracWysiwyg.prototype.createDecorationMenu = function(d) {
    var html = [
        '<ul class="menu">',
        '<li><a id="wt-strike" href="#">Strike through</a></li>',
        '<li><a id="wt-sup" href="#">Superscript</a></li>',
        '<li><a id="wt-sub" href="#">Subscript</a></li>',
        '</ul>' ];
    var menu = d.createElement("div");
    menu.className = "wysiwyg-menu";
    TracWysiwyg.setStyle(menu, { position: "absolute", left: "-1000px", top: "-1000px", zIndex: 1000 });
    menu.innerHTML = html.join("").replace(/ href="#">/g, ' href="#" onmousedown="return false" tabindex="-1">');
    return menu;
};

TracWysiwyg.prototype.createTableMenu = function(d) {
    var html = [
        '<ul class="menu">',
        '<li><a id="wt-insert-row-before" href="#">Insert row before</a></li>',
        '<li><a id="wt-insert-row-after" href="#">Insert row after</a></li>',
        '<li><a id="wt-insert-col-before" href="#">Insert column before</a></li>',
        '<li><a id="wt-insert-col-after" href="#">Insert column after</a></li>',
        '<li><a id="wt-delete-row" href="#">Delete row</a></li>',
        '<li><a id="wt-delete-col" href="#">Delete column</a></li>',
        '</ul>' ];
    var menu = d.createElement("div");
    menu.className = "wysiwyg-menu";
    TracWysiwyg.setStyle(menu, { position: "absolute", left: "-1000px", top: "-1000px", zIndex: 1000 });
    menu.innerHTML = html.join("").replace(/ href="#">/g, ' href="#" onmousedown="return false" tabindex="-1">');
    return menu;
};

TracWysiwyg.prototype.setupMenuEvents = function() {
    function addToolbarEvent(element, self, args) {
        var method = args.shift();
        addEvent(element, "click", function(event) {
            var w = self.contentWindow;
            TracWysiwyg.stopEvent(event || w.event);
            var keepMenus = false, exception;
            try { keepMenus = method.apply(self, args) } catch (e) { exception = e }
            if (!keepMenus) {
                self.hideAllMenus();
            }
            element.blur();
            w.focus();
            if (exception) {
                throw exception;
            }
        });
    }

    function argsByType(self, name, element) {
        switch (name) {
        case "style":       return [ self.toggleMenu, self.styleMenu, element ];
        case "strong":      return [ self.execDecorate, "bold" ];
        case "em":          return [ self.execDecorate, "italic" ];
        case "underline":   return [ self.execDecorate, "underline" ];
        case "strike":      return [ self.execDecorate, "strikethrough" ];
        case "sub":         return [ self.execDecorate, "subscript" ];
        case "sup":         return [ self.execDecorate, "superscript" ];
        case "monospace":   return [ self.execDecorate, "monospace" ];
        case "decorationmenu":  return [ self.toggleMenu, self.decorationMenu, element ];
        case "remove":      return [ self.execCommand, "removeformat" ];
        case "paragraph":   return [ self.formatParagraph ];
        case "heading1":    return [ self.formatHeaderBlock, "h1" ];
        case "heading2":    return [ self.formatHeaderBlock, "h2" ];
        case "heading3":    return [ self.formatHeaderBlock, "h3" ];
        case "heading4":    return [ self.formatHeaderBlock, "h4" ];
        case "heading5":    return [ self.formatHeaderBlock, "h5" ];
        case "heading6":    return [ self.formatHeaderBlock, "h6" ];
        case "link":        return [ self.createLink ];
        case "unlink":      return [ self.execCommand, "unlink" ];
        case "ol":          return [ self.insertOrderedList ];
        case "ul":          return [ self.insertUnorderedList ];
        case "outdent":     return [ self.outdent ];
        case "indent":      return [ self.indent ];
        case "table":       return [ self.insertTable ];
        case "tablemenu":   return [ self.toggleMenu, self.tableMenu, element ];
        case "insert-row-before":   return [ self.insertTableRow, false ];
        case "insert-row-after":    return [ self.insertTableRow, true ];
        case "insert-col-before":   return [ self.insertTableColumn, false ];
        case "insert-col-after":    return [ self.insertTableColumn, true ];
        case "delete-row":  return [ self.deleteTableRow ];
        case "delete-col":  return [ self.deleteTableColumn ];
        case "code":        return [ self.formatCodeBlock ];
        case "quote":       return [ self.formatQuoteBlock ];
        case "hr":          return [ self.insertHorizontalRule ];
        case "br":          return [ self.insertLineBreak ];
        }
        return null;
    }

    function setup(container) {
        var elements = container.getElementsByTagName("a");
        var length = elements.length;
        for (var i = 0; i < length; i++) {
            var element = elements[i];
            var name = element.id.replace(/^wt-/, "");
            var args = argsByType(this, name, element);
            if (args) {
                addToolbarEvent(element, this, args);
                buttons[name] = element;
            }
        }
    }

    var buttons = {};
    setup.call(this, this.wysiwygToolbar);
    for (var i = 0; i < this.menus.length; i++) {
        setup.call(this, this.menus[i]);
    }
    return buttons;
};

TracWysiwyg.prototype.toggleMenu = function(menu, element) {
    if (parseInt(menu.style.left, 10) < 0) {
        this.hideAllMenus(menu);
        var position = TracWysiwyg.elementPosition(element);
        TracWysiwyg.setStyle(menu, { left: position[0] + "px", top: (position[1] + 18) + "px" });
    }
    else {
        this.hideAllMenus();
    }
    return true;
};

TracWysiwyg.prototype.hideAllMenus = function(except) {
    var menus = this.menus;
    var length = menus.length;
    for (var i = 0; i < length; i++) {
        if (menus[i] != except) {
            TracWysiwyg.setStyle(menus[i], { left: "-1000px", top: "-1000px" });
        }
    }
};

TracWysiwyg.prototype.execDecorate = function(name) {
    if (this.selectionContainsTagName("pre")) {
        return;
    }
    var getSelfOrAncestor = TracWysiwyg.getSelfOrAncestor;
    var position = this.getSelectionPosition();
    var ancestor = {};
    ancestor.start = getSelfOrAncestor(position.start, /^(?:a|tt)$/);
    ancestor.end = getSelfOrAncestor(position.end, /^(?:a|tt)$/);
    this.expandSelectionToElement(ancestor);

    if (name != "monospace") {
        this.execCommand(name);
    }
    else {
        this.execDecorateMonospace();
    }
    this.selectionChanged();
};

TracWysiwyg.prototype.execDecorateMonospace = function() {
    var html = this.getSelectionHTML();
    var removePattern = /<tt.*?>|<\/tt>/gi;
    if (/^<tt.*?>/i.test(html) && /<\/tt>$/i.test(html)) {
        html = html.replace(removePattern, "");
    }
    else {
        var id = this.generateDomId();
        html = '<tt id="' + id + '">' + html.replace(removePattern, "") + "</tt>";
    }
    this.insertHTML(html);
    var node = this.contentDocument.getElementById(id);
    if (node) {
        this.selectNode(node);
    }
};

TracWysiwyg.prototype.execCommand = function(name, arg) {
    return this.contentDocument.execCommand(name, false, arg);
};

TracWysiwyg.prototype.setupEditorEvents = function() {
    var getSelfOrAncestor = TracWysiwyg.getSelfOrAncestor;
    var self = this;
    var d = this.contentDocument;
    var w = this.contentWindow;
    var ime = false;

    function listenerKeydown(event) {
        var method = null;
        var args = null;
        event = event || self.contentWindow.event;
        var keyCode = event.keyCode;
        switch (keyCode) {
        case 0x09:  // TAB
            var range = self.getSelectionRange();
            var stop = false;
            var element = getSelfOrAncestor(range.startContainer, /^(?:li|pre|table)$/);
            if (element) {
                switch (element.tagName.toLowerCase()) {
                case "li":
                    self.execCommand(event.shiftKey ? "outdent" : "indent");
                    self.selectionChanged();
                    stop = true;
                    break;
                case "pre":
                    self.insertHTML("\t");
                    stop = true;
                    break;
                case "table":
                    if (getSelfOrAncestor(range.endContainer, "table") == element) {
                        self.moveFocusInTable(!event.shiftKey);
                        self.selectionChanged();
                        stop = true;
                    }
                    break;
                }
            }
            if (stop) {
                TracWysiwyg.stopEvent(event);
            }
            return;
        case 0xe5:
            ime = true;
            break;
        }
        switch ((keyCode & 0x00fffff) | (event.ctrlKey ? 0x40000000 : 0)
            | (event.shiftKey ? 0x20000000 : 0) | (event.altKey ? 0x10000000 : 0))
        {
        case 0x40000042:  // C-b
            method = self.execDecorate;
            args = [ "bold" ];
            break;
        case 0x40000049:  // C-i
            method = self.execDecorate;
            args = [ "italic" ];
            break;
        case 0x4000004c:  // C-l
            method = self.toggleAutolink;
            args = [];
            break;
        case 0x40000055:  // C-u
            method = self.execDecorate;
            args = [ "underline" ];
            break;
        case 0x40000059:  // C-y
            method = self.execCommand;
            args = [ "redo" ];
            break;
        case 0x4000005a:  // C-z
            method = self.execCommand;
            args = [ "undo" ];
            break;
        }
        if (method !== null) {
            TracWysiwyg.stopEvent(event);
            method.apply(self, args);
            self.selectionChanged();
        }
        else if (keyCode) {
            var focus = self.getFocusNode();
            if (!getSelfOrAncestor(focus, /^(?:p|li|h[1-6]|t[dh]|d[td]|pre|blockquote)$/)) {
                self.execCommand("formatblock", "<p>");
            }
        }
    }
    addEvent(d, window.opera ? "keypress" : "keydown", listenerKeydown);

    function listenerKeypress(event) {
        event = event || self.contentWindow.event;
        var modifier = (event.ctrlKey ? 0x40000000 : 0)
            | (event.shiftKey ? 0x20000000 : 0) | (event.altKey ? 0x10000000 : 0);
        switch (event.charCode || event.keyCode) {
        case 0x20:  // SPACE
            self.detectTracLink(event);
            return;
        case 0x3e:  // ">"
            self.detectTracLink(event);
            return;
        case 0x0d:  // ENTER
            self.detectTracLink(event);
            switch (modifier) {
            case 0:
                if (self.insertParagraphOnEnter) {
                    self.insertParagraphOnEnter(event);
                }
                break;
            case 0x20000000:    // Shift
                if (self.insertLineBreakOnShiftEnter) {
                    self.insertLineBreakOnShiftEnter(event);
                }
                break;
            }
            return;
        }
    }
    addEvent(d, "keypress", listenerKeypress);

    function listenerKeyup(event) {
        var keyCode = event.keyCode;
        if (ime) {
            switch (keyCode) {
            case 0x20:  // SPACE
                self.detectTracLink(event);
                break;
            }
            ime = false;
        }
        self.selectionChanged();
    }
    addEvent(d, "keyup", listenerKeyup);

    function listenerMouseup(event) {
        self.selectionChanged();
    }
    addEvent(d, "mouseup", listenerMouseup);

    function listenerClick(event) {
        self.hideAllMenus();
        self.selectionChanged();
    }
    addEvent(d, "click", listenerClick);
};

TracWysiwyg.prototype.loadWysiwygDocument = function() {
    var d = this.contentDocument;
    var container = d.body;
    var tmp;

    while (tmp = container.lastChild) {
        container.removeChild(tmp);
    }
    var fragment = this.wikitextToFragment(this.textarea.value, d, this.options);
    container.appendChild(fragment);
    
    // PJL
    container.innerHTML = convert(this.textarea.value);
    this.savedWysiwygHTML = container.innerHTML;
};

TracWysiwyg.prototype.focusWysiwyg = function() {
    var self = this;
    var w = this.contentWindow;
    function lazy() {
        w.focus();
        try { self.execCommand("useCSS", false); } catch (e) { }
        try { self.execCommand("styleWithCSS", false); } catch (e) { }
        self.selectionChanged();
    }
    setTimeout(lazy, 10);
};

TracWysiwyg.prototype.loadTracWikiText = function() {
    this.textarea.value = this.domToWikitext(this.contentDocument.body, this.options);
    this.savedWysiwygHTML = null;
};

TracWysiwyg.prototype.focusTextarea = function() {
    this.textarea.focus();
};

TracWysiwyg.prototype.setupToggleEditorButtons = function() {
    var div = document.createElement("div");
    var mode = TracWysiwyg.editorMode;
    var html = ''
        + '<label for="editor-autolink-@" title="Links as you type (Ctrl-L)">'
        + '<input type="checkbox" id="editor-autolink-@" checked="checked" />'
        + 'autolink </label>'
        + '<label for="editor-wysiwyg-@">'
        + '<input type="radio" name="__EDITOR__@" value="wysiwyg" id="editor-wysiwyg-@" '
        + (mode == "wysiwyg" ? 'checked="checked"' : '') + ' />'
        + 'wysiwyg</label> '
        + '<label for="editor-textarea-@">'
        + '<input type="radio" name="__EDITOR__@" value="textarea" id="editor-textarea-@" '
        + (mode == "textarea" ? 'checked="checked"' : '') + ' />'
        + 'textarea</label> '
        + '&nbsp; ';
    div.className = "editor-toggle";
    div.innerHTML = html.replace(/@/g, ++TracWysiwyg.count);
    this.toggleEditorButtons = div;

    var buttons = div.getElementsByTagName("input");
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        switch (button.type) {
        case "checkbox":
            var listener = this.listenerToggleAutolink(button);
            addEvent(button, "click", listener);
            addEvent(button, "keypress", listener);
            this.autolinkButton = button;
            break;
        case "radio":
            addEvent(button, "click", this.listenerToggleEditor(button.value));
            break;
        }
    }
};

TracWysiwyg.prototype.setupSyncTextAreaHeight = function() {
    var self = this;
    var d = document;
    var timer = null;

    var editrows = document.getElementById("editrows");
    if (editrows) {
        addEvent(editrows, "change", changeHeight);
    }
    if (this.textareaResizable) {
        addEvent(this.textarea.nextSibling, "mousedown", beginDrag);
    }

    function changeHeight() {
        if (timer !== null) {
            clearTimeout(timer);
        }
        setTimeout(sync, 10);
    }

    function beginDrag(event) {
        addEvent(d, "mousemove", changeHeight);
        addEvent(d, "mouseup", endDrag);
    }

    function endDrag(event) {
        TracWysiwyg.removeEvent(d, "mousemove", changeHeight);
        TracWysiwyg.removeEvent(d, "mouseup", endDrag);
    }

    function sync() {
        timer = null;
        self.syncTextAreaHeight();
    }
};

TracWysiwyg.prototype.syncTextAreaHeight = function() {
    var height = this.textarea.offsetHeight;
    var frame = this.frame;
    if (height > 0 && frame.height != height) {
        frame.height = height;
    }
};
TracWysiwyg.prototype.detectTracLink = function(event) {
    if (!this.autolink) {
        return;
    }
    var range = this.getSelectionRange();
    var node = range.startContainer;
    if (!node || !range.collapsed) {
        return;
    }
    var getSelfOrAncestor = TracWysiwyg.getSelfOrAncestor;
    if (getSelfOrAncestor(node, /^(?:a|tt|pre)$/)) {
        return;
    }

    var offset = range.startOffset;
    if (node.nodeType != 3) {
        node = node.childNodes[offset];
        while (node && node.nodeType != 3) {
            node = node.lastChild;
        }
        if (!node) {
            return;
        }
        offset = node.nodeValue.length;
    }
    else if (offset == 0) {
        node = node.previousSibling;
        if (!node || node.nodeType == 1) {
            return;
        }
        offset = node.nodeValue.length;
    }
    var startContainer = node;
    var endContainer = node;
    var text = [ node.nodeValue.substring(0, offset) ];
    for ( ; ; ) {
        if (/[ \t\r\n\f\v]/.test(text[text.length - 1])) {
            break;
        }
        node = node.previousSibling;
        if (!node || node.nodeType == 1) {
            break;
        }
        text.push(node.nodeValue);
        startContainer = node;
    }
    text.reverse();
    text = text.join("");
    if (!text) {
        return;
    }

    var pattern = this.wikiDetectTracLinkPattern;
    pattern.lastIndex = /[^ \t\r\n\f\v]*$/.exec(text).index;
    var match, tmp;
    for (tmp = pattern.exec(text); tmp; tmp = pattern.exec(text)) {
        match = tmp;
    }
    if (!match) {
        return;
    }

    var label = match[0];
    var link = this.normalizeTracLink(label);
    var id = this.generateDomId();
    var anchor = this.createAnchor(link, label, { id: id, "tracwysiwyg-autolink": true });
    var anonymous = this.contentDocument.createElement("div");
    anonymous.appendChild(anchor);
    var html = anonymous.innerHTML;

    node = endContainer;
    var startOffset = match.index;
    while (startContainer != node && startOffset >= startContainer.nodeValue.length) {
        startOffset -= startContainer.nodeValue.length;
        startContainer = startContainer.nextSibling;
    }
    var endOffset = startOffset + label.length;
    endContainer = startContainer;
    while (endContainer != node && endOffset >= endContainer.nodeValue.length) {
        endOffset -= endContainer.nodeValue.length;
        endContainer = endContainer.nextSibling;
    }
    this.selectRange(startContainer, startOffset, endContainer, endOffset);

    offset = text.length - match.index - label.length;
    if (offset == 0) {
        switch (event.keyCode) {
        case 0x20:  // SPACE
            this.insertHTML(html + "\u00a0");
            TracWysiwyg.stopEvent(event);
            return;
        case 0x0d:  // ENTER
            if (event.shiftKey) {
                if (window.opera || !anonymous.addEventListener) {
                    this.insertHTML(html + "<br>");
                    if (window.opera) {
                        anchor = this.contentDocument.getElementById(id);
                        node = anchor.parentNode;
                        offset = node.childNodes.length;
                        this.selectRange(node, offset, node, offset);
                    }
                    TracWysiwyg.stopEvent(event);
                    return;
                }
            }
            this.insertHTML(html);
            anchor = this.contentDocument.getElementById(id);
            node = event.shiftKey ? anchor.parentNode : anchor;
            offset = node.childNodes.length;
            this.selectRange(node, offset, node, offset);
            return;
        }
    }
    this.insertHTML(html);
    anchor = this.contentDocument.getElementById(id);
    node = anchor.nextSibling;
    if (!node) {
        node = anchor.parentNode;
        offset = node.childNodes.length;
    }
    this.selectRange(node, offset, node, offset);
};

TracWysiwyg.prototype.formatParagraph = function() {
    if (this.selectionContainsTagName("table")) {
        return;
    }
    this.execCommand("formatblock", "<p>");
    this.selectionChanged();
};

TracWysiwyg.prototype.formatHeaderBlock = function(name) {
    if (this.selectionContainsTagName("table")) {
        return;
    }
    this.execCommand("formatblock", "<" + name + ">");
    this.selectionChanged();
};

TracWysiwyg.prototype.insertOrderedList = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    this.execCommand("insertorderedlist");
    this.selectionChanged();
};

TracWysiwyg.prototype.insertUnorderedList = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    this.execCommand("insertunorderedlist");
    this.selectionChanged();
};

TracWysiwyg.prototype.outdent = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    this.execCommand("outdent");
};

TracWysiwyg.prototype.indent = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    this.execCommand("indent");
};

TracWysiwyg.prototype.insertTable = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    var id = this.generateDomId();
    this.insertHTML(this.tableHTML(id, 2, 3));
    var element = this.contentDocument.getElementById(id)
    if (element) {
        this.selectNodeContents(element);
    }
    this.selectionChanged();
};

TracWysiwyg.prototype._tableHTML = function(row, col) {
    var tr = "<tr>" + ((1 << col) - 1).toString(2).replace(/1/g, "<td></td>") + "</tr>";
    var html = [
        '<table class="wiki">', '<tbody>',
        ((1 << row) - 1).toString(2).replace(/1/g, tr),
        '</tbody>', '</table>' ];
    return html.join("");
};

TracWysiwyg.prototype._getFocusForTable = function() {
    var hash = { node: null, cell: null, row: null, table: null };
    hash.node = this.getFocusNode();
    hash.cell = hash.node ? TracWysiwyg.getSelfOrAncestor(hash.node, /^t[dh]$/) : null;
    hash.row = hash.cell ? TracWysiwyg.getSelfOrAncestor(hash.cell, "tr") : null;
    hash.table = hash.row ? TracWysiwyg.getSelfOrAncestor(hash.row, "table") : null;
    return hash;
};

TracWysiwyg.prototype.insertTableRow = function(after) {
    var focus = this._getFocusForTable();
    if (focus.table && focus.row) {
        var d = this.contentDocument;
        var cells = focus.row.getElementsByTagName("td");
        var row = focus.table.insertRow(focus.row.rowIndex + (after ? 1 : 0));
        for (var j = 0; j < cells.length; j++) {
            this.insertTableCell(row, 0);
        }
    }
};

TracWysiwyg.prototype.insertTableColumn = function(after) {
    var focus = this._getFocusForTable();
    if (focus.table && focus.cell) {
        var d = this.contentDocument;
        var rows = focus.table.rows;
        var length = rows.length;
        var cellIndex = focus.cell.cellIndex + (after ? 1 : 0);
        for (var i = 0; i < length; i++) {
            var row = rows[i];
            this.insertTableCell(row, Math.min(cellIndex, row.cells.length));
        }
    }
};

TracWysiwyg.prototype.deleteTableRow = function() {
    var focus = this._getFocusForTable();
    if (focus.table && focus.row) {
        focus.table.deleteRow(focus.row.rowIndex);
    }
};

TracWysiwyg.prototype.deleteTableColumn = function() {
    var focus = this._getFocusForTable();
    if (focus.table && focus.cell) {
        var rows = focus.table.rows;
        var length = rows.length;
        var cellIndex = focus.cell.cellIndex;
        for (var i = 0; i < length; i++) {
            var row = rows[i];
            if (cellIndex < row.cells.length) {
                row.deleteCell(cellIndex);
            }
        }
    }
};

TracWysiwyg.prototype.moveFocusInTable = function(forward) {
    var getSelfOrAncestor = TracWysiwyg.getSelfOrAncestor;
    var focus = this.getFocusNode();
    var element = getSelfOrAncestor(focus, /^(?:t[dhr]|table)$/);
    var target, table, rows, cells;
    switch (element.tagName.toLowerCase()) {
    case "td": case "th":
        focus = element;
        var row = getSelfOrAncestor(element, "tr");
        cells = row.cells;
        if (forward) {
            if (focus.cellIndex + 1 < cells.length) {
                target = cells[focus.cellIndex + 1];
            }
            else {
                table = getSelfOrAncestor(row, /^(?:tbody|table)$/);
                rows = table.rows;
                target = row.rowIndex + 1 < rows.length ? rows[row.rowIndex + 1].cells[0] : null;
            }
        }
        else {
            if (focus.cellIndex > 0) {
                target = cells[focus.cellIndex - 1];
            }
            else {
                table = getSelfOrAncestor(row, /^(?:tbody|table)$/);
                rows = table.rows;
                if (row.rowIndex > 0) {
                    cells = rows[row.rowIndex - 1].cells;
                    target = cells[cells.length - 1];
                }
                else {
                    target = null;
                }
            }
        }
        break;
    case "tr":
        cells = element.cells;
        target = cells[forward ? 0 : cells.length - 1];
        break;
    case "tbody": case "table":
        rows = element.rows;
        cells = rows[forward ? 0 : rows.length - 1].cells;
        target = cells[forward ? 0 : cells.length - 1];
        break;
    }
    if (target) {
        this.selectNodeContents(target);
    }
    else if (table) {
        table = getSelfOrAncestor(table, "table");
        var parent = table.parentNode;
        var elements = parent.childNodes;
        var length = elements.length;
        for (var offset = 0; offset < length; offset++) {
            if (table == elements[offset]) {
                if (forward) {
                    offset++;
                }
                this.selectRange(parent, offset, parent, offset);
            }
        }
    }
};

TracWysiwyg.prototype.formatCodeBlock = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    var text = this.getSelectionText();
    if (!text) {
        var node = this.getFocusNode();
        while (node.nodeType == 3) {
            node = node.parentNode;
        }
        text = TracWysiwyg.getTextContent(node);
        this.selectNode(node);
    }

    var fragment = this.getSelectionFragment();
    text = this.domToWikitext(fragment, { formatCodeBlock: true }).replace(/\s+$/, "");

    var d = this.contentDocument;
    var anonymous = d.createElement("div");
    var pre = d.createElement("pre");
    pre.className = "wiki";
    anonymous.appendChild(pre);
    if (text) {
        pre.appendChild(d.createTextNode(text));
    }

    this.insertHTML(anonymous.innerHTML);
    this.selectionChanged();
};

TracWysiwyg.prototype.formatQuoteBlock = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    var d = this.contentDocument;
    var anonymous = d.createElement("div");

    var container = d.createElement("blockquote");
    container.className = "citation";
    var fragment = this.getSelectionFragment();
    var childNodes = fragment.childNodes;
    for (var i = childNodes.length - 1; i >= 0; i--) {
        var child = childNodes[i];
        var text = null;
        switch (child.nodeType) {
        case 1:
            if (child.tagName.toLowerCase() != "blockquote" || child.className != "citation") {
                text = TracWysiwyg.getTextContent(child);
            }
            break;
        case 3:
            text = child.nodeValue;
            break;
        default:
            continue;
        }
        if (text !== null) {
            if (!text) {
                continue;
            }
            var tmp = d.createElement("p");
            tmp.appendChild(d.createTextNode(text));
            child = tmp;
        }
        container.insertBefore(child, container.firstChild);
    }
    if (container.childNodes.length == 0) {
        container.appendChild(d.createElement("p"));
    }
    anonymous.appendChild(container);

    this.insertHTML(anonymous.innerHTML);
    this.selectionChanged();
};

TracWysiwyg.prototype.insertHorizontalRule = function() {
    if (this.selectionContainsTagName("table") || this.selectionContainsTagName("pre")) {
        return;
    }
    if (!this.execCommand("inserthorizontalrule")) {
        this.insertHTML("<hr />");
    }
    this.selectionChanged();
};

TracWysiwyg.prototype.createLink = function() {
    if (this.selectionContainsTagName("pre")) {
        return;
    }

    var focus = this.getFocusNode();
    var anchor = TracWysiwyg.getSelfOrAncestor(focus, "a");
    var expand = anchor || TracWysiwyg.getSelfOrAncestor(focus, "tt");
    var currLink;
    if (anchor) {
        if (anchor.getAttribute("tracwysiwyg-autolink") == "tracwysiwyg-autolink") {
            var pattern = this.wikiDetectTracLinkPattern;
            pattern.lastIndex = 0;
            var label = TracWysiwyg.getTextContent(anchor);
            var match = pattern.exec(label);
            if (match && match.index == 0 && match[0].length == label.length) {
                currLink = this.normalizeTracLink(label);
            }
        }
        if (!currLink) {
            currLink = anchor.getAttribute("tracwysiwyg-link") || anchor.href;
        }
    }
    else {
        currLink = "";
    }
    if (expand) {
        this.selectNodeContents(expand);
    }
    var text = this.getSelectionText() || "";
    var newLink = (prompt(text ? "Enter TracLink:" : "Insert TracLink:", currLink) || "").replace(/^\s+|\s+$/g, "");
    if (newLink && newLink != currLink) {
        text = text || newLink;
        newLink = this.normalizeTracLink(newLink);
        var id = this.generateDomId();
        var d = this.contentDocument;
        var anonymous = d.createElement("div");
        anchor = this.createAnchor(newLink, text, { id: id });
        anonymous.appendChild(anchor);
        this.insertHTML(anonymous.innerHTML);
        anchor = d.getElementById(id);
        if (anchor) {
            this.selectNodeContents(anchor);
        }
    }
    this.selectionChanged();
};

TracWysiwyg.prototype.createAnchor = function(link, label, attrs) {
    var d = this.contentDocument;
    var anchor = d.createElement("a");
    for (var name in attrs) {
        var value = attrs[name];
        switch (typeof value) {
        case "boolean":
            value = name;
            break;
        }
        anchor.setAttribute(name, value);
    }
    anchor.href = TracWysiwyg.quickSearchURL(link);
    anchor.title = link;
    anchor.setAttribute("tracwysiwyg-link", link);
    anchor.setAttribute("onclick", "return false;");
    anchor.appendChild(d.createTextNode(label));
    return anchor;
};
TracWysiwyg.prototype.collectChildNodes = function(dest, source) {
    var childNodes = source.childNodes;
    for (var i = childNodes.length - 1; i >= 0; i--) {
        dest.insertBefore(childNodes[i], dest.firstChild);
    }
};

TracWysiwyg.prototype.generateDomId = function() {
    var d = this.contentDocument;
    for ( ; ; ) {
        var id = "tmp-" + (new Date().valueOf().toString(36));
        if (!d.getElementById(id)) {
            return id;
        }
    }
};

TracWysiwyg.prototype.selectionChanged = function() {
    var status = {
        strong: false, em: false, underline: false, strike: false, sub: false,
        sup: false, monospace: false, paragraph: false, heading1: false,
        heading2: false, heading3: false, heading4: false, heading5: false,
        heading6: false, link: false, ol: false, ul: false, outdent: false,
        indent: false, table: false, code: false, quote: false, hr: false,
        br: false };
    var tagNameToKey = {
        b: "strong", i: "em", u: "underline", del: "strike", tt: "monospace",
        p: "paragraph", h1: "heading1", h2: "heading2", h3: "heading3",
        h4: "heading4", h5: "heading5", h6: "heading6", a: "link", pre: "code",
        blockquote: "quote" };
    var position = this.getSelectionPosition();

    var node;
    if (position.start) {
        node = position.start == position.end ? position.start.firstChild : position.start.nextSibling;
        node = node || position.start;
    }
    else {
        node = null;
    }
    while (node) {
        if (node.nodeType == 1) {
            var name = node.tagName.toLowerCase();
            if (name in tagNameToKey) {
                name = tagNameToKey[name];
            }
            status[name] = true;
        }
        node = node.parentNode;
    }

    var toolbarButtons = this.toolbarButtons;
    for (var name in status) {
        var button = toolbarButtons[name];
        if (button) {
            var parent = button.parentNode;
            parent.className = (parent.className || "").replace(/ *\bselected\b|$/, status[name] ? " selected" : "");
        }
    }

    var styles = [ "quote", "paragraph", "code", "heading1",
        "heading2", "heading3", "heading4", "heading5", "heading6" ];
    var styleButton = toolbarButtons["style"];
    var styleButtonClass = "wysiwyg-menu-style";
    for (var i = 0; i < styles.length; i++) {
        var name = styles[i];
        if (status[name]) {
            styleButtonClass = "wysiwyg-menu-" + name;
            break;
        }
    }
    styleButton.parentNode.className = styleButtonClass;
};

(function() {
    var _linkScheme = "[a-zA-Z][a-zA-Z0-9+-.]*";
    // cf. WikiSystem.XML_NAME, http://www.w3.org/TR/REC-xml/#id
    var _xmlName = "[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD](?:[-:_.A-Za-z0-9\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]*[-_A-Za-z0-9\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD])?"
    var _quotedString = "'[^']+'|" + '"[^"]+"';
    var _changesetId = "(?:\\d+|[a-fA-F\\d]{6,})";
    var _ticketLink = "#\\d+";
    var _reportLink = "\\{\\d+\\}";
    var _changesetPath = "/[^\\]]*";
    var _changesetLinkBracket = "\\[" + _changesetId + "(?:" + _changesetPath + ")?\\]";
    var _changesetLinkRev = "r" + _changesetId + "\\b(?!:" + _changesetId + ")";
    var _logLinkBracket = "\\[" + _changesetId + "[-:]" + _changesetId + "(?:" + _changesetPath + ")?\\]";
    var _logLinkRev = "r" + _changesetId + "[-:]" + _changesetId + "\\b";
    var _tracLink = _linkScheme + ":(?:" + _quotedString
        + "|[a-zA-Z0-9/?!#@](?:(?:\\|(?=[^| \\t\\r\\f\\v])|[^|<> \\t\\r\\f\\v])*[a-zA-Z0-9/=])?)";
    var _wikiPageName = "[A-Z][a-z]+(?:[A-Z][a-z]*[a-z/])+(?:#[\\w:][-\\w\\d.:]*)?"
        + "(?=:(?:$|[ \\t\\r\\f\\v])|[^:a-zA-Z]|[ \\t\\r\\f\\v]|$)";
    var wikiInlineRules = [];
    wikiInlineRules.push("!?\\\*_");        // 1. bolditalic
    wikiInlineRules.push("!?\\\*");          // 2. bold
    wikiInlineRules.push("!?_");           // 3. italic
    wikiInlineRules.push("!?\\+");           // 4. underline
    wikiInlineRules.push("!?-");           // 5. strike
    wikiInlineRules.push("!?,,");           // 6. subscript
    wikiInlineRules.push("!?\\^");          // 7. superscript
    wikiInlineRules.push("!?\\{\\{\\{.*?\\}\\}\\}");  // 8. code block
    wikiInlineRules.push("!?`.*?`");        // 9. inline
    wikiInlineRules.push("[!&]?" + _ticketLink);    // 10. ticket
    wikiInlineRules.push("!?" + _reportLink);       // 11. report
                                            // 12. changeset
    wikiInlineRules.push("!?" + _changesetLinkBracket + "|(?:\\b|!)" + _changesetLinkRev);
                                            // 13. log
    wikiInlineRules.push("!?" + _logLinkBracket + "|(?:\\b|!)" + _logLinkRev);
    wikiInlineRules.push("!?" + _tracLink); // 14. wiki:TracLinks
    wikiInlineRules.push("!?\\[(?:"         // 15. [wiki:TracLinks label] or [/relative label]
        + "[/.#][^ \\t\\r\\f\\v[\\]]*|"
        + _linkScheme + ":(?:" + _quotedString + "|[^\\] \\t\\r\\f\\v]*)|"
        + _wikiPageName + "[ \\t\\r\\f\\v]+(?:" + _quotedString + "|[^\\]]+)"
        + ")(?:[ \\t\\r\\f\\v]+(?:" + _quotedString + "|[^\\]]+))?\\]");
                                            // 16. [[macro]]
    wikiInlineRules.push("!?\\[\\[(?:[\\w/+-]+\\??|\\?)(?:\\]\\]|\\(.*?\\)\\]\\])");
                                            // 17. WikiPageName
    wikiInlineRules.push("(?:\\b|!)" + _wikiPageName);
                                            // 18. ["internal free link"]
    wikiInlineRules.push("!?\\[(?:" + _quotedString + ")\\]");
                                            // 19. <wiki:Trac bracket links>
    wikiInlineRules.push("!?<@:[^>]+>".replace(/@/g, _linkScheme));
                                            // 20. [=#anchor label]
    wikiInlineRules.push("!?\\[=#" + _xmlName + "(?:[ \\t\\r\\f\\v]+[^\\]]*)?\\]");

    var wikiToDomInlineRules = wikiInlineRules.slice(0);
                                            // 1001. escaping double pipes
    wikiToDomInlineRules.push("!=?(?:\\|\\|)+(?:[ \\t\\r\\f\\v]*$|)");

    var wikiRules = wikiToDomInlineRules.slice(0);
    wikiRules.push("^(?: *>)+[ \\t\\r\\f\\v]*");    // -1. citation
                                            // -2. header
    wikiRules.push("^[ \\t\\r\\f\\v]*={1,6}[ \\t\\r\\f\\v]+.*?(?:#" + _xmlName + ")?[ \\t\\r\\f\\v]*$");
                                            // -3. list
    wikiRules.push("^[ \\t\\r\\f\\v]*(?:[-*]|[0-9]+\\.|[a-zA-Z]\\.|[ivxIVX]{1,5}\\.) ");
                                            // -4. definition
    wikiRules.push("^[ \\t\\r\\f\\v]+(?:`[^`]*`|\\{\\{\\{.*?\\}\\}\\}|[^`{:]|:[^:])+::(?:[ \\t\\r\\f\\v]+|$)");
    wikiRules.push("^[ \\t\\r\\f\\v]+(?=[^ \\t\\r\\f\\v])");    // -5. leading space
    wikiRules.push("=?(?:\\|\\|)+[ \\t\\r\\f\\v]*\\\\?$");      // -6. closing table row
    wikiRules.push("=?(?:\\|\\|)+=?");                  // -7. cell

    var domToWikiInlineRules = wikiInlineRules.slice(0);
    domToWikiInlineRules.push("!?=?(?:\\|\\|)+=?");     // cell

    var wikiSyntaxRules = [];
    wikiSyntaxRules.push(_ticketLink);
    wikiSyntaxRules.push(_reportLink);
    wikiSyntaxRules.push(_changesetLinkBracket);
    wikiSyntaxRules.push(_changesetLinkRev);
    wikiSyntaxRules.push(_logLinkBracket);
    wikiSyntaxRules.push(_logLinkRev);

    var wikiDetectTracLinkRules = [];
    wikiDetectTracLinkRules.push(_ticketLink);
    wikiDetectTracLinkRules.push(_reportLink);
    wikiDetectTracLinkRules.push(_changesetLinkBracket);
    wikiDetectTracLinkRules.push("\\b" + _changesetLinkRev);
    wikiDetectTracLinkRules.push(_logLinkBracket);
    wikiDetectTracLinkRules.push("\\b" + _logLinkRev);
    wikiDetectTracLinkRules.push(_tracLink);
    wikiDetectTracLinkRules.push("\\b" + _wikiPageName);

    var domToWikiInlinePattern = new RegExp("(?:" + domToWikiInlineRules.join("|") + ")", "g");
    var wikiRulesPattern = new RegExp("(?:(" + wikiRules.join(")|(") + "))", "g");
    var wikiSyntaxPattern = new RegExp("^(?:" + wikiSyntaxRules.join("|") + ")$");
    var wikiSyntaxLogPattern = new RegExp("^[\\[r]" + _changesetId + "[-:]");
    var wikiDetectTracLinkPattern = new RegExp("(?:" + wikiDetectTracLinkRules.join("|") + ")", "g");

    TracWysiwyg.prototype._linkScheme = _linkScheme;
    TracWysiwyg.prototype._quotedString = _quotedString;
    TracWysiwyg.prototype._changesetId = _changesetId;
    TracWysiwyg.prototype._tracLink = _tracLink;
    TracWysiwyg.prototype._wikiPageName = _wikiPageName;
    TracWysiwyg.prototype.wikiInlineRules = wikiInlineRules;
    TracWysiwyg.prototype.wikiToDomInlineRules = wikiToDomInlineRules;
    TracWysiwyg.prototype.xmlNamePattern = new RegExp("^" + _xmlName + "$");
    TracWysiwyg.prototype.domToWikiInlinePattern = domToWikiInlinePattern;
    TracWysiwyg.prototype.wikiRulesPattern = wikiRulesPattern;
    TracWysiwyg.prototype.wikiSyntaxPattern = wikiSyntaxPattern;
    TracWysiwyg.prototype.wikiSyntaxLogPattern = wikiSyntaxLogPattern;
    TracWysiwyg.prototype.wikiDetectTracLinkPattern = wikiDetectTracLinkPattern;
})();

TracWysiwyg.prototype.normalizeTracLink = function(link) {
    link = this.convertWikiSyntax(link);
    if (/^[\/.#]/.test(link)) {
        link = encode(link);
    }
    if (!/^[\w.+-]+:/.test(link)) {
        link = "wiki:" + link;
    }
    if (/^wiki:[^\"\']/.test(link) && /\s/.test(link)) {
        if (link.indexOf('"') < 0) {
            link = 'wiki:"' + link + '"';
        }
        else if (link.indexOf("'") < 0) {
            link = "wiki:'" + link + "'";
        }
        else {
            link = 'wiki:"' + link.replace(/"/g, "%22") + '"';
        }
    }
    return link;
};

TracWysiwyg.prototype.convertWikiSyntax = function(link) {
    var match = this.wikiSyntaxPattern.exec(link);
    if (match) {
        switch (match[0].charCodeAt(0)) {
        case 0x7b:  // "{"
            link = "report:" + link.slice(1, -1);
            break;
        case 0x5b:  // "["
            link = (this.wikiSyntaxLogPattern.test(link) ? "log:@" : "changeset:") + link.slice(1, -1);
            break;
        case 0x23:  // #
            link = "ticket:" + link.substring(1);
            break;
        case 0x72:  // r
            link = (this.wikiSyntaxLogPattern.test(link) ? "log:@" : "changeset:") + link.substring(1);
            break;
        }
    }
    return link;
};

TracWysiwyg.prototype.isInlineNode = function(node) {
    if (node) {
        switch (node.nodeType) {
        case 1:
            return (node.tagName.toLowerCase() in this.wikiInlineTags);
        case 3:
            return true;
        }
    }
    return false;
};

(function() {
    var blocks = {
        p: true, blockquote: true, div: true,
        li: true, ul: true, ol: true,
        dl: true, dt: true, dd: true,
        h1: true, h2: true, h3: true, h4: true, h5: true, h6: true,
        table: true, thead: true, tbody: true, tr: true, td: true, th: true };

    function generator(prop, blocks) {
        return function (node) {
            if (!node) {
                return false;
            }
            for ( ; ; ) {
                if (node[prop]) {
                    return false;
                }
                node = node.parentNode;
                if (!node) {
                    return true;
                }
                if (node.nodeType == 1 && node.tagName.toLowerCase() in blocks) {
                    return true;
                }
            }
            return false;
        };
    }

    TracWysiwyg.prototype.isLastChildInBlockNode = generator("nextSibling", blocks);
    TracWysiwyg.prototype.isFirstChildInBlockNode = generator("previousSibling", blocks);
})();

TracWysiwyg.prototype.wikitextToFragment = function(wikitext, contentDocument, options) {
    options = options || {};
    var escapeNewlines = !!options.escapeNewlines;

    var getSelfOrAncestor = TracWysiwyg.getSelfOrAncestor;
    var quickSearchURL = TracWysiwyg.quickSearchURL;
    var _linkScheme = this._linkScheme;
    var _quotedString = this._quotedString;
    var wikiInlineRulesCount = this.wikiInlineRules.length;
    var wikiToDomInlineRulesCount = this.wikiToDomInlineRules.length;
    var wikiRulesPattern = new RegExp(this.wikiRulesPattern.source, "g");

    var self = this;
    var fragment = contentDocument.createDocumentFragment();
    var holder = fragment;
    var lines = wikitext.split("\n");
    var codeText = null;
    var currentHeader = null;
    var quoteDepth = [];
    var listDepth = [];
    var decorationStatus;
    var decorationStack;
    var inCodeBlock, inParagraph, inDefList, inTable, inTableRow, continueTableRow;
    inCodeBlock = inParagraph = inDefList = inTable = inTableRow = continueTableRow = false;

    function handleCodeBlock(line) {
        if (/^ *\{\{\{ *$/.test(line)) {
            inCodeBlock++;
            if (inCodeBlock == 1) {
                closeParagraph();
                codeText = [];
            }
            else {
                codeText.push(line);
            }
        }
        else if (/^ *\}\}\} *$/.test(line)) {
            inCodeBlock--;
            if (inCodeBlock == 0) {
                var pre = contentDocument.createElement("pre");
                pre.className = "wiki";
                pre.appendChild(contentDocument.createTextNode(codeText.join(
                    pre.addEventListener && !window.opera ? "\n" : "\n\r")));
                holder.appendChild(pre);
                codeText = [];
            }
            else {
                codeText.push(line);
            }
        }
        else {
            codeText.push(line);
        }
    }

    function handleCitation(value) {
        var quote = /^(?: *>)+/.exec(value)[0];
        var depth = quote.replace(/ +/g, "").length;

        if (depth > quoteDepth.length) {
            closeToFragment("blockquote");
            while (depth > quoteDepth.length) {
                openQuote((new RegExp("^(?: *>){" + (quoteDepth.length + 1) + "}")).exec(quote)[0].length, true);
            }
        }
        else if (depth == quoteDepth.length) {
            // nothing to do
        }
        else {
            closeParagraph();
            while (depth < quoteDepth.length) {
                closeQuote();
            }
        }
    }

    function openQuote(length, citation) {
        var target = holder;
        if (target != fragment) {
            target = getSelfOrAncestor(target, "blockquote");
        }

        var element = contentDocument.createElement("blockquote");
        if (citation) {
            element.className = "citation";
        }
        (target || fragment).appendChild(element);
        holder = element;
        quoteDepth.push(length);
    }

    function closeQuote() {
        var target = getSelfOrAncestor(holder, "blockquote");
        holder = target.parentNode;
        quoteDepth.pop();
    }

    function handleHeader(line) {
        var match = /^\s*(=+)[ \t\r\f\v]+.*?(?:#([^ \t\r\f\v]+))?[ \t\r\f\v]*$/.exec(line);
        if (!match) {
            return null;
        }

        closeToFragment();
        var tag = "h" + match[1].length;
        var element = contentDocument.createElement(tag);
        if (match[2]) {
            element.id = match[2];
        }
        fragment.appendChild(element);
        holder = element;
        return tag;
    }

    function closeHeader() {
        if (currentHeader) {
            var target = getSelfOrAncestor(holder, currentHeader);
            holder = target.parentNode;
            currentHeader = null;
        }
    }

    function handleInline(name) {
        if (name == "bolditalic") {
            if (decorationStatus.italic) {
                handleInline("italic");
                handleInline("bold");
            }
            else {
                handleInline("bold");
                handleInline("italic");
            }
            return;
        }

        var d = contentDocument;
        if (decorationStatus[name]) {
            var tagNames = [];
            for (var index = decorationStack.length - 1; index >= 0; index--) {
                var tagName = holder.tagName;
                holder = holder.parentNode;
                if (decorationStack[index] == name) {
                    break;
                }
                tagNames.push(tagName);
            }
            decorationStack.splice(index, 1);
            decorationStatus[name] = false;
            while (tagNames.length > 0) {
                var element = d.createElement(tagNames.pop());
                holder.appendChild(element);
                holder = element;
            }
            return;
        }

        var tagName;
        switch (name) {
        case "bold":        tagName = "b";      break;
        case "italic":      tagName = "i";      break;
        case "underline":   tagName = "u";      break;
        case "strike":      tagName = "del";    break;
        case "subscript":   tagName = "sub";    break;
        case "superscript": tagName = "sup";    break;
        }

        if (holder == fragment) {
            openParagraph();
        }
        element = d.createElement(tagName);
        holder.appendChild(element);
        holder = element;
        decorationStatus[name] = true;
        decorationStack.push(name);
    }

    function handleInlineCode(value, length) {
        var d = contentDocument;
        var element = d.createElement("tt");
        value = value.slice(length, -length);
        if (value.length > 0) {
            element.appendChild(d.createTextNode(value));
            holder.appendChild(element);
        }
    }

    function createAnchor(link, label) {
        var anchor = self.createAnchor(link, label);
        holder.appendChild(anchor);
    }

    function handleTracLinks(value) {
        var match = handleTracLinks.pattern.exec(value);
        if (match) {
            var link = match[1];
            if (!/^(?:[\w.+-]+:|[\/.#].*)/.test(link)) {
                link = "wiki:" + link;
            }
            var text = (match[2] || match[1].replace(/^[\w.+-]+:/, "")).replace(/^(["'])(.*)\1$/g, "$2");
            createAnchor(link, text);
        }
        else {
            holder.appendChild(contentDocument.createTextNode(value));
        }
    }
    handleTracLinks.pattern = new RegExp("\\["
        + "((?:" + _linkScheme + ":)?(?:" + _quotedString + "|[^\\]\\s]+))"
        + "(?:\\s+(.*))?\\]");

    function handleTracWikiLink(value) {
        createAnchor(value, value);
    }

    function handleBracketLinks(value) {
        var d = contentDocument;
        var link = value.slice(1, -1);
        var anchor = self.createAnchor(link, link);
        var _holder = holder;
        _holder.appendChild(d.createTextNode("<"));
        _holder.appendChild(anchor);
        _holder.appendChild(d.createTextNode(">"));
    }

    function handleWikiPageName(name, label) {
        createAnchor("wiki:" + name, label || name);
    }

    function handleTracOtherLinks(value) {
        createAnchor(self.convertWikiSyntax(value), value);
    }

    function handleTracTicketLink(value) {
        if (!/^&/.test(value)) {
            handleTracOtherLinks(value);
            return true;
        }
        return false;
    }

    function handleWikiAnchor(text) {
        var match = /^\[=#([^ \t\r\f\v\]]+)(?:[ \t\r\f\v]+([^\]]*))?\]$/.exec(text);
        var d = contentDocument;
        var element = d.createElement("span");
        element.className = "wikianchor";
        element.id = match[1];
        if (match[2]) {
            element.appendChild(self.wikitextToOnelinerFragment(match[2], d, self.options));
        }
        holder.appendChild(element);
    }

    function handleList(value) {
        var match = /^(\s*)(?:([-*])|((?:([0-9]+)|([a-z])|([A-Z])|[ivxIVX]{1,5})))/.exec(value);
        var tag, className, depth, start;
        if (!match) {
            holder.appendChild(contentDocument.createTextNode(value));
            return;
        }

        depth = match[1].length;
        if (match[2]) {
            tag = "ul";
        }
        else if (match[3]) {
            tag = "ol";
            switch (match[3]) {
            case "0":
                className = "arabiczero";
                break;
            case "1":
                break;
            case "i":
                className = "lowerroman";
                break;
            case "I":
                className = "upperroman";
                break;
            default:
                if (match[4]) {
                    start = parseInt(match[4], 10);
                }
                else if (match[5]) {
                    className = "loweralpha";
                }
                else if (match[6]) {
                    className = "upperalpha";
                }
                break;
            }
        }

        var last = listDepth.length - 1;
        if (depth > (last >= 0 ? listDepth[last] : -1)) {
            closeToFragment("li");
            openList(tag, className, start, depth);
        }
        else {
            var container, list;
            if (listDepth.length > 1 && depth < listDepth[last]) {
                do {
                    if (depth >= listDepth[last]) {
                        break;
                    }
                    closeList();
                    last = listDepth.length - 1;
                } while (listDepth.length > 1);
                container = holder;
            }
            else {
                list = getSelfOrAncestor(holder, "li");
                self.appendBogusLineBreak(list);
                container = list.parentNode;
            }
            if (tag != container.tagName.toLowerCase()) {
                holder = container.parentNode;
                listDepth.pop();
                openList(tag, className, start, depth);
            }
            else {
                var tmp = contentDocument.createElement("li");
                container.appendChild(tmp);
                holder = tmp;
                listDepth[last] = depth;
            }
        }
    }

    function openList(tag, className, start, depth) {
        var d = contentDocument;
        var h = holder;

        var container = d.createElement(tag);
        if (className) {
            container.className = className;
        }
        if (start) {
            container.setAttribute("start", start);
        }
        var list = d.createElement("li");
        container.appendChild(list);

        var target;
        if (h == fragment) {
            target = fragment;
        }
        else {
            target = getSelfOrAncestor(h, "li");
            target = target ? target.parentNode : h;
        }
        target.appendChild(container);
        holder = list;
        listDepth.push(depth);
    }

    function closeList() {
        var h = holder;
        var target = getSelfOrAncestor(h, "li");
        if (target) {
            self.appendBogusLineBreak(target);
            holder = target.parentNode.parentNode;
        }
        else {
            holder = h.parentNode;
        }
        listDepth.pop();
    }

    function handleDefinition(value) {
        var d = contentDocument;
        var h = holder;
        var dl = null;
        if (inDefList) {
            dl = getSelfOrAncestor(h, "dl");
        }
        else {
            closeParagraph();
            dl = d.createElement("dl");
            fragment.appendChild(dl);
            inDefList = true;
        }

        var match = /^ +(.*?)\s*::/.exec(value);
        var dt = d.createElement("dt");
        var oneliner = self.wikitextToOnelinerFragment(match[1], d, self.options);
        dt.appendChild(oneliner);
        dl.appendChild(dt);

        var dd = d.createElement("dd");
        dl.appendChild(dd);
        holder = dd;
    }

    function closeDefList() {
        var element = getSelfOrAncestor(holder, "dl");
        if (element) {
            holder = element.parentNode;
        }
        inDefList = false;
    }

    function handleIndent(value) {
        var depth = value.length;
        var last = quoteDepth.length - 1;

        if (depth > (last >= 0 ? quoteDepth[last] : 0)) {
            closeParagraph();
            closeTable();
            openQuote(depth, false);
        }
        else {
            while (quoteDepth.length > 0) {
                if (depth >= quoteDepth[last]) {
                    break;
                }
                closeToFragment("blockquote");
                closeQuote();
                last = quoteDepth.length - 1;
            }
            quoteDepth[last] = depth;
        }
    }

    function openParagraph() {
        if (!inParagraph) {
            var element = contentDocument.createElement("p");
            holder.appendChild(element);
            holder = element;
            inParagraph = true;
        }
    }

    function closeParagraph() {
        if (inParagraph) {
            var target = holder;
            if (target != fragment) {
                target = getSelfOrAncestor(target, "p");
                self.appendBogusLineBreak(target);
            }
            holder = target.parentNode;
            inParagraph = false;
        }
    }

    function handleTableCell(action, colspan, header, align) {
        var d = contentDocument;
        var h, table, tbody;

        if (!inTable) {
            closeToFragment("blockquote");
            h = holder;
            table = d.createElement("table");
            table.className = "wiki";
            tbody = d.createElement("tbody");
            table.appendChild(tbody);
            h.appendChild(table);
            inTable = true;
            inTableRow = false;
        }
        else {
            h = holder;
            tbody = getSelfOrAncestor(h, "tbody");
        }

        if (inTableRow) {
            var cell = getSelfOrAncestor(h, "td");
            if (cell) {
                self.appendBogusLineBreak(cell);
            }
        }

        var row;
        switch (action) {
        case 1:
            row = d.createElement("tr");
            tbody.appendChild(row);
            inTableRow = true;
            break;
        case 0:
            row = getSelfOrAncestor(h, "tr");
            break;
        case -1:
            if (inTableRow) {
                var target = getSelfOrAncestor(h, "tr");
                holder = target.parentNode;
                inTableRow = false;
            }
            return;
        }

        var cell = d.createElement(header ? "th" : "td");
        if (colspan > 1) {
            cell.setAttribute("colSpan", colspan);
        }
        switch (align) {
            case -1:    align = "left";     break;
            case 0:     align = "center";   break;
            case 1:     align = "right";    break;
            default:    align = null;       break;
        }
        if (align !== null) {
            cell.setAttribute("align", align);
        }
        row.appendChild(cell);
        holder = cell;
    }

    function closeTable() {
        if (inTable) {
            var target = getSelfOrAncestor(holder, "table");
            holder = target.parentNode;
            inTable = inTableRow = false;
        }
    }

    function closeToFragment(stopTag) {
        var element = holder;
        var _fragment = fragment;
        stopTag = stopTag ? stopTag.toLowerCase() : null;

        while (element != _fragment) {
            var tag = element.tagName.toLowerCase();
            if (tag == stopTag) {
                holder = element;
                return;
            }
            var method;
            switch (tag) {
            case "p":
                method = closeParagraph;
                break;
            case "li": case "ul": case "ol":
                method = closeList;
                break;
            case "dd":
                method = closeDefList;
                break;
            case "blockquote":
                method = closeQuote;
                break;
            case "td": case "tr": case "tbody": case "table":
                method = closeTable;
                break;
            default:
                break;
            }
            if (method) {
                method();
                element = holder;
            }
            else {
                element = element.parentNode;
            }
        }

        holder = _fragment;
    }

    function getMatchNumber(match) {
        var length = match.length;
        for (var i = 1; i < length; i++) {
            if (match[i]) {
                if (i <= wikiInlineRulesCount) {
                    return i;
                }
                if (i <= wikiToDomInlineRulesCount) {
                    return i - wikiInlineRulesCount + 1000;
                }
                return wikiToDomInlineRulesCount - i;
            }
        }
        return null;
    }

    for (var indexLines = 0; indexLines < lines.length; indexLines++) {
        var line = lines[indexLines].replace(/\r$/, "");
        if (inCodeBlock || /^ *\{\{\{ *$/.test(line)) {
            handleCodeBlock(line);
            continue;
        }
        if (/^----/.test(line)) {
            closeToFragment();
            fragment.appendChild(contentDocument.createElement("hr"));
            continue;
        }
        if (line.length == 0) {
            closeToFragment();
            continue;
        }
        line = line.replace(/\t/g, "        ");
        line = line.replace(/\u00a0/g, " ");

        wikiRulesPattern.lastIndex = 0;
        var prevIndex = wikiRulesPattern.lastIndex;
        decorationStatus = {};
        decorationStack = [];
        for ( ; ; ) {
            var match = wikiRulesPattern.exec(line);
            var matchNumber = null;
            var text = null;
            if (match) {
                matchNumber = getMatchNumber(match);
                if (prevIndex < match.index) {
                    text = line.substring(prevIndex, match.index);
                }
            }
            else {
                text = line.substring(prevIndex);
            }

            if ((prevIndex == 0 && text || match && match.index == 0 && matchNumber > 0)
                && (!inParagraph || quoteDepth.length > 0)
                && (!inDefList || !/^ /.test(line)))
            {
                closeToFragment();
            }
            if (text || match && matchNumber > 0) {
                if (inParagraph && (prevIndex == 0 || quoteDepth.length > 0)) {
                    if (escapeNewlines) {
                        if (quoteDepth.length == 0) {
                            holder.appendChild(contentDocument.createElement("br"));
                        }
                    }
                    else {
                        text = text ? (" " + text) : " ";
                    }
                }
                if (!inTable && quoteDepth.length > 0 || holder == fragment) {
                    if (!inParagraph) {
                        openParagraph();
                    }
                }
                if (text) {
                    holder.appendChild(contentDocument.createTextNode(text));
                }
            }
            if (!match) {
                break;
            }
            prevIndex = wikiRulesPattern.lastIndex;
            var matchText = match[0];

            if (!/^!/.test(matchText)) {    // start '!'
                switch (matchNumber) {
                case 1:     // bolditalic
                    handleInline("bolditalic");
                    continue;
                case 2:     // bold
                    handleInline("bold");
                    continue;
                case 3:     // italic
                    handleInline("italic");
                    continue;
                case 4:     // underline
                    handleInline("underline");
                    continue;
                case 5:     // strike
                    handleInline("strike");
                    continue;
                case 6:     // subscript
                    handleInline("subscript");
                    continue;
                case 7:     // superscript
                    handleInline("superscript");
                    continue;
                case 8:     // code block
                    handleInlineCode(matchText, 3);
                    continue;
                case 9:     // inline
                    handleInlineCode(matchText, 1);
                    continue;
                case 10:    // ticket
                    if (handleTracTicketLink(matchText)) {
                        continue;
                    }
                    break;
                case 11:    // report
                case 12:    // changeset
                case 13:    // log
                    handleTracOtherLinks(matchText);
                    continue;
                case 14:    // wiki:TracLinks
                    handleTracWikiLink(matchText);
                    continue;
                case 15:    // [wiki:TracLinks label]
                    handleTracLinks(matchText);
                    continue;
                case 16:    // [[macro]]
                    break;
                case 17:    // WikiPageName
                    handleWikiPageName(matchText);
                    continue;
                case 18:    // ["internal free link"]
                    handleWikiPageName(matchText.slice(1, -1), matchText.slice(2, -2));
                    continue;
                case 19:    // <wiki:Trac bracket links>
                    handleBracketLinks(matchText);
                    continue;
                case 20:    // [=#anchor label]
                    handleWikiAnchor(matchText);
                    continue;
                case 1001:  // escaping double escape
                    break;
                case -1:    // citation
                    if (escapeNewlines && inParagraph) {
                        holder.appendChild(contentDocument.createElement("br"));
                    }
                    handleCitation(matchText);
                    if (escapeNewlines) {
                        openParagraph();
                    }
                    continue;
                case -2:    // header
                    currentHeader = handleHeader(matchText);
                    if (currentHeader) {
                        line = line.replace(/(?:[ \t\r\f\v]+#[^ \t\r\f\v]+)?[ \t\r\f\v]*$/, "");
                        var m = /^\s*(=+)[ \t\r\f\v]+/.exec(line);
                        if (line.slice(-m[1].length) == m[1]) {
                            line = line.slice(0, -m[1].length).replace(/[ \t\r\f\v]+$/, "");
                        }
                        wikiRulesPattern.lastIndex = prevIndex = m[0].length;
                        continue;
                    }
                    break;
                case -3:    // list
                    handleList(matchText)
                    continue;
                case -4:    // definition
                    handleDefinition(matchText);
                    continue;
                case -5:    // leading space
                    if (listDepth.length == 0 && !inDefList) {
                        handleIndent(matchText);
                        continue;
                    }
                    if (!this.isInlineNode(holder.lastChild)) {
                        continue;
                    }
                    matchText = matchText.replace(/^\s+/, " ");
                    break;
                case -6:    // closing table row
                    if (inTable) {
                        if (matchText.slice(-1) != "\\") {
                            handleTableCell(-1);
                        }
                        else {
                            continueTableRow = true;
                        }
                        continue;
                    }
                    break;
                case -7:    // cell
                    if (quoteDepth.length > 0 && match.index == 0) {
                        closeToFragment();
                    }
                    var align = null;
                    for ( ; ; ) {       // lookahead next double pipes
                        var m = wikiRulesPattern.exec(line);
                        switch (m ? getMatchNumber(m) : 0) {
                        case 0: case -6: case -7:
                            var end = m ? m.index : line.length;
                            if (prevIndex < end) {
                                var tmp = line.substring(prevIndex, end);
                                var m = /^([ \t\r\n\f\v]*)(.*?)([ \t\r\n\f\v]*)$/.exec(tmp);
                                if (m) {
                                    if (m[1].length == tmp.length) {
                                        align = null;
                                    }
                                    else if ((m[1].length == 0) === (m[3].length == 0)) {
                                        align = m[1].length >= 2 && m[3].length >= 2 ? 0 : null;
                                    }
                                    else {
                                        align = m[1].length == 0 ? -1 : 1;
                                    }
                                    tmp = m[2];
                                }
                                line = line.substring(0, prevIndex) + tmp + line.substring(end);
                            }
                            break;
                        default:
                            continue;
                        }
                        break;
                    }
                    wikiRulesPattern.lastIndex = prevIndex;
                    handleTableCell(inTableRow ? 0 : 1,
                        matchText.replace(/^=|=$/g, '').length / 2, matchText.slice(-1) == "=", align);
                    continue;
                }
            }

            if (matchText) {
                if (listDepth.length == 0 && !currentHeader && !inDefList && !inTable) {
                    openParagraph();
                }
                var tmp;
                if (matchNumber == 16) {
                    tmp = /^!?\[\[br\]\]$/i.test(matchText)
                        ? (matchText.charCodeAt(0) == 0x21
                            ? contentDocument.createTextNode(matchText.substring(1))
                            : contentDocument.createElement("br"))
                        : contentDocument.createTextNode(matchText);
                }
                else {
                    tmp = contentDocument.createTextNode(/^!/.test(matchText) ? matchText.substring(1) : matchText);
                }
                holder.appendChild(tmp);
            }
        }
        if (currentHeader) {
            closeHeader();
        }
        if (inTable) {
            if (continueTableRow) {
                continueTableRow = false;
            }
            else {
                handleTableCell(-1);
            }
        }
    }
    closeToFragment();

    return fragment;
};

TracWysiwyg.prototype.wikitextToOnelinerFragment = function(wikitext, contentDocument, options) {
    var source = this.wikitextToFragment(wikitext, contentDocument, options);
    //var source = convert(document.getElementById('textile').value);
    var fragment = contentDocument.createDocumentFragment();
    this.collectChildNodes(fragment, source.firstChild);
    return fragment;
};

TracWysiwyg.prototype.wikiOpenTokens = {
    "h1": "h1. ", "h2": "h2. ", "h3": "h3. ", "h4": "h4. ", "h5": "h5. ", "h6": "h6. ",
    "b": "\*", "strong": "*",
    "i": "_", "em": "_",
    "u": "+",
    "del": "-", "strike": "-",
    "sub": ",,",
    "sup": "^",
    "hr": "----\n",
    "dl": true,
    "dt": " ",
    "dd": " ",
    "table": true,
    "tbody": true };

TracWysiwyg.prototype.wikiCloseTokens = {
    "#text": true,
    "a": true,
    "tt": true,
    "h1": "", "h2": "", "h3": "", "h4": "", "h5": "", "h6": "",
    "b": "*", "strong": "*",
    "i": "_", "em": "_",
    "u": "+",
    "del": "-", "strike": "-",
    "sub": ",,",
    "sup": "^",
    "br": true,
    "hr": true,
    "dl": "\n",
    "dt": "::",
    "dd": "\n",
    "tbody": true,
    "tr": "||\n",
    "td": true, "th": true };

TracWysiwyg.prototype.wikiBlockTags = {
    "h1": true, "h2": true, "h3": true, "h4": true, "h5": true, "h6": true,
    "table": true, "dl": true, "hr": true };

TracWysiwyg.prototype.wikiInlineTags = {
    "a": true, "tt": true, "b": true, "strong": true, "i": true, "em": true,
    "u": true, "del": true, "strike": true, "sub": true, "sup": true,
    "br": true, "span": true };

TracWysiwyg.prototype.domToWikitext = function(root, options) {
    options = options || {};
    var formatCodeBlock = !!options.formatCodeBlock;
    var escapeNewlines = !!options.escapeNewlines;

    var self = this;
    var getTextContent = TracWysiwyg.getTextContent;
    var getSelfOrAncestor = TracWysiwyg.getSelfOrAncestor;
    var wikiOpenTokens = this.wikiOpenTokens;
    var wikiCloseTokens = this.wikiCloseTokens;
    var wikiInlineTags = this.wikiInlineTags;
    var wikiBlockTags = this.wikiBlockTags;
    var xmlNamePattern = this.xmlNamePattern;
    var domToWikiInlinePattern = this.domToWikiInlinePattern;
    var wikiSyntaxPattern = this.wikiSyntaxPattern;
    var tracLinkPattern = new RegExp("^" + this._tracLink + "$");
    var wikiPageNamePattern = new RegExp("^" + this._wikiPageName + "$");
    var decorationTokenPattern = /^(?:'''|''|\+|__|\^|,,)$/;

    var texts = [];
    var stack = [];
    var last = root;
    var listDepth = 0;
    var quoteDepth = 0;
    var quoteCitation = false;
    var inCodeBlock = false;
    var skipNode = null;
    var openBracket = false;

    function escapeText(s) {
        var match = /^!?\[\[(.+)\]\]$/.exec(s);
        if (match) {
            return match[1].toLowerCase() != "br" ? s : "!" + s;
        }
        if (/^&#\d+/.test(s)) {
            return s;
        }
        return "!" + s;
    }

    function isTailEscape() {
        var t = texts;
        var length = t.length;
        return length > 0 ? /!$/.test(t[length - 1]) : false;
    }

    function tokenFromSpan(node) {
        if (node.className == "underline") {
            return wikiOpenTokens["u"];
        }
        var style = node.style;
        if (style.fontWeight == "bold") {
            return wikiOpenTokens["b"];
        }
        if (style.fontStyle == "italic") {
            return wikiOpenTokens["i"];
        }
        switch (style.textDecoration) {
        case "underline":
            return wikiOpenTokens["u"];
        case "line-through":
            return wikiOpenTokens["del"];
        }
        switch (style.verticalAlign) {
        case "sub":
            return wikiOpenTokens["sub"];
        case "sup":
            return wikiOpenTokens["sup"];
        }
        return null;
    }

    function nodeDecorations(node) {
        var _wikiOpenTokens = wikiOpenTokens;
        var _decorationTokenPattern = decorationTokenPattern;
        var hash = {};

        for ( ; ; ) {
            var childNodes = node.childNodes;
            if (!childNodes || childNodes.length != 1) {
                break;
            }
            var child = childNodes[0];
            if (child.nodeType != 1) {
                break;
            }
            var token = _wikiOpenTokens[child.tagName.toLowerCase()];
            if (_decorationTokenPattern.test(token)) {
                hash[token] = true;
            }
            node = child;
        }

        return hash;
    }

    function pushTextWithDecorations(text, node, traclink) {
        var _texts = texts;
        var _decorationTokenPattern = decorationTokenPattern;
        var decorationsHash = nodeDecorations(node);
        var decorations = [];
        var cancelDecorations = [];

        while (_texts.length > 0) {
            var token = _texts[_texts.length - 1];
            if (_decorationTokenPattern.test(token)) {
                if (decorationsHash[token]) {
                    delete decorationsHash[token];
                    cancelDecorations.push(_texts.pop());
                    continue;
                }
                if ((token == "h3." || token == "h2.") && _texts.length > 1) {
                    var moreToken = _texts[_texts.length - 2];
                    if (_decorationTokenPattern.test(moreToken)
                        && token + moreToken == "h5."
                        && decorationsHash[moreToken])
                    {
                        delete decorationsHash[moreToken];
                        cancelDecorations.push(moreToken);
                        _texts[_texts.length - 2] = _texts[_texts.length - 1];
                        _texts.pop();
                    }
                }
            }
            break;
        }

        for (var token in decorationsHash) {
            decorations.push(token);
        }
        decorations.sort();

        if (decorations.length > 0) {
            _texts.push.apply(_texts, decorations);
        }
        if (traclink) {
            if (_texts.length > 0 && /[\w.+-]$/.test(_texts[_texts.length - 1])) {
                _texts.push(traclink);
            }
            else {
                text = new String(text);
                text["tracwysiwyg-traclink"] = traclink;
                _texts.push(text);
            }
        }
        else {
            _texts.push(text);
        }
        if (decorations.length > 0) {
            decorations.reverse();
            _texts.push.apply(_texts, decorations);
        }
        if (cancelDecorations.length > 0) {
            cancelDecorations.reverse();
            _texts.push.apply(_texts, cancelDecorations);
        }
    }

    function pushOpenToken(token) {
        var _texts = texts;
        var _decorationTokenPattern = decorationTokenPattern;
        var length = _texts.length;
        if (length == 0 || !_decorationTokenPattern.test(token)) {
            _texts.push(token);
            return;
        }
        var last = _texts[length - 1];
        if (!_decorationTokenPattern.test(last)) {
            _texts.push(token);
            return;
        }
        if (last == token) {
            _texts.pop();
            return;
        }
        if (length < 2 || last + token != "'''''") {
            _texts.push(token);
            return;
        }
        if (_texts[length - 2] == token) {
            _texts[length - 2] = _texts[length - 1];
            _texts.pop();
        }
        else {
            _texts.push(token);
        }
    }

    function tracLinkText(link, label) {
        if (!/\]/.test(label) && !/^[\"\']/.test(label)) {
            return "[" + link + " " + label + "]";
        }
        if (!/\"/.test(label)) {
            return "[" + link + ' "' + label + '"]';
        }
        if (!/\'/.test(label)) {
            return "[" + link + " '" + label + "']";
        }
        return "[" + link + ' "' + label.replace(/"+/g, "") + '"]';
    }

    function pushAnchor(node, bracket) {
        var link = (node.getAttribute("tracwysiwyg-link") || node.href).replace(/^\s+|\s+$/g, "");
        var label = getTextContent(node).replace(/^\s+|\s+$/g, "");
        if (!label) {
            return;
        }
        var text = null;
        var traclink = null;
        if (node.getAttribute("tracwysiwyg-autolink") == "tracwysiwyg-autolink") {
            if (wikiPageNamePattern.test(label)) {
                text = label;
                link = "wiki:" + label;
                traclink = "[wiki:" + label + "]";
            }
            else if (wikiSyntaxPattern.test(label)) {
                text = label;
                link = self.convertWikiSyntax(label);
            }
            else if (tracLinkPattern.test(label)) {
                text = link = label;
            }
        }
        else {
            if (link == label) {
                if (bracket) {
                    text = label;
                }
                else if (tracLinkPattern.test(label)) {
                    text = label;
                }
            }
        }
        if (!text) {
            var match = /^([\w.+-]+):(@?(.*))$/.exec(link);
            if (match) {
                if (label == match[2]) {
                    if (match[1] == "wiki" && wikiPageNamePattern.test(match[2])) {
                        text = match[2];
                        traclink = "[wiki:" + text + "]";
                    }
                    else {
                        text = "[" + link + "]";
                    }
                }
                else {
                    var usingLabel = false;
                    switch (match[1]) {
                    case "changeset":
                        usingLabel = label == "[" + match[2] + "]" || /^\d+$/.test(match[2]) && label == "r" + match[2];
                        break;
                    case "log":
                        usingLabel = label == "[" + match[3] + "]" || label == "r" + match[3];
                        break;
                    case "report":
                        usingLabel = label == "{" + match[2] + "}";
                        break;
                    case "ticket":
                        usingLabel = label == "#" + match[2];
                        break;
                    }
                    if (usingLabel) {
                        text = label;
                    }
                }
            }
        }
        if (isTailEscape()) {
            texts.push(" ");
        }
        if (text === null) {
            text = tracLinkText(link, label);
        }
        if (!traclink && /^[\w.+-]/.test(text)) {
            traclink = tracLinkText(link, label);
        }
        pushTextWithDecorations(text, node, traclink);
    }

    function string(source, times) {
        var value = (1 << times) - 1;
        if (value <= 0) {
            return "";
        }
        else {
            return value.toString(2).replace(/1/g, source);
        }
    }

    function open(name, node) {
        if (skipNode) {
            return;
        }
        var _texts = texts;
        var token = wikiOpenTokens[name];
        if (token) {
            if (name in wikiBlockTags && self.isInlineNode(node.previousSibling)) {
                _texts.push("\n");
            }
            if (token !== true) {
                if (name in wikiInlineTags && isTailEscape()) {
                    _texts.push(" ");
                }
                pushOpenToken(token);
            }
            openBracket = false;
        }
        else {
            switch (name) {
            case "#text":
                var value = node.nodeValue;
                if (value) {
                    if (!inCodeBlock) {
                        if (value && !self.isInlineNode(node.previousSibling || node.parentNode)) {
                            value = value.replace(/^[ \t\r\n\f\v]+/g, "");
                        }
                        if (value && !self.isInlineNode(node.nextSibling || node.parentNode)) {
                            value = value.replace(/[ \t\r\n\f\v]+$/g, "");
                        }
                        value = value.replace(/\r?\n/g, " ");
                        if (!formatCodeBlock) {
                            value = value.replace(domToWikiInlinePattern, escapeText);
                        }
                        openBracket = /<$/.test(value);
                    }
                    if (value) {
                        var length = _texts.length;
                        var prev = length > 0 ? _texts[length - 1] : null;
                        if (prev && prev["tracwysiwyg-traclink"] && tracLinkPattern.test(prev + value.substring(0, 1))) {
                            _texts[length - 1] = prev["tracwysiwyg-traclink"];
                        }
                        _texts.push(value);
                    }
                }
                break;
            case "p":
                if (quoteDepth > 0) {
                    _texts.push(string(quoteCitation ? "> " : "  ", quoteDepth));
                }
                else if (!/[^ \t\r\n\f\v]/.test(getTextContent(node))) {
                    skipNode = node;
                }
                break;
            case "a":
                skipNode = node;
                var bracket = false;
                if (openBracket) {
                    var nextSibling = node.nextSibling;
                    bracket = nextSibling && nextSibling.nodeType == 3 && /^>/.test(nextSibling.nodeValue);
                    openBracket = false;
                }
                pushAnchor(node, bracket);
                break;
            case "li":
                _texts.push(" " + string("  ", listDepth - 1));
                var container = node.parentNode;
                if ((container.tagName || "").toLowerCase() == "ol") {
                    var start = container.getAttribute("start") || "";
                    if (start != "1" && /^(?:[0-9]+|[a-zA-Z]|[ivxIVX]{1,5})$/.test(start)) {
                        _texts.push(start, ". ");
                    }
                    else {
                        switch (container.className) {
                        case "arabiczero":  _texts.push("0. "); break;
                        case "lowerroman":  _texts.push("i. "); break;
                        case "upperroman":  _texts.push("I. "); break;
                        case "loweralpha":  _texts.push("a. "); break;
                        case "upperalpha":  _texts.push("A. "); break;
                        default:            _texts.push("1. "); break;
                        }
                    }
                }
                else {
                    _texts.push("* ");
                }
                break;
            case "ul": case "ol":
                if (listDepth == 0) {
                    if (self.isInlineNode(node.previousSibling)) {
                        _texts.push("\n");
                    }
                }
                else if (listDepth > 0) {
                    if (node.parentNode.tagName.toLowerCase() == "li") {
                        _texts.push("\n");
                    }
                }
                listDepth++;
                break;
            case "br":
                if (!self.isBogusLineBreak(node)) {
                    var value = null;
                    if (inCodeBlock) {
                        value = "\n";
                    }
                    else if (formatCodeBlock) {
                        switch (((node.parentNode || {}).tagName || "").toLowerCase()) {
                        case "li":
                            value = "\n " + string("  ", listDepth);
                            break;
                        case "p": case "blockquote":
                            value = "\n";
                            if (quoteDepth > 0) {
                                value += string(quoteCitation ? "> " : "  ", quoteDepth);
                            }
                            break;
                        case "dd":
                            value = "\n    ";
                            break;
                        case "dt":
                        case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
                            value = " ";
                            break;
                        default:
                            value = "\n";
                            break;
                        }
                    }
                    else {
                        if (escapeNewlines && getSelfOrAncestor(node, /^(?:p|blockquote)$/)) {
                            value = quoteDepth > 0
                                ? "\n" + string(quoteCitation ? "> " : "  ", quoteDepth)
                                : "\n";
                        }
                        if (!value) {
                            value = "[[BR]]";
                            var length = _texts.length;
                            if (length > 0) {
                                var lastText = _texts[length - 1];
                                var tmp = lastText + "[[BR]]";
                                var _pattern = domToWikiInlinePattern;
                                _pattern.lastIndex = 0;
                                var lastMatch, match;
                                while (match = _pattern.exec(tmp)) {
                                    lastMatch = match;
                                }
                                if (lastMatch && lastMatch.index < lastText.length
                                    && lastMatch.index + lastMatch[0].length > lastText.length)
                                {
                                    value = " [[BR]]";
                                }
                            }
                        }
                    }
                    _texts.push(value);
                }
                break;
            case "pre":
                _texts.push(
                    /^(?:li|dd)$/i.test(node.parentNode.tagName) || self.isInlineNode(node.previousSibling)
                    ? "\n{{{\n" : "{{{\n");
                inCodeBlock = true;
                break;
            case "blockquote":
                if (self.isInlineNode(node.previousSibling)) {
                    _texts.push("\n");
                }
                quoteDepth++;
                if (quoteDepth == 1) {
                    quoteCitation = (node.className == "citation");
                }
                break;
            case "th":
                var header = true;
            case "td":
                skipNode = node;
                var colspan = node.getAttribute("colSpan");
                colspan = colspan ? parseInt(colspan, 10) : 0;
                _texts.push(colspan > 1 ? string("||", colspan) : "||");
                if (header) {
                    _texts.push("=");
                }
                var align = node.style.textAlign;
                if (!align) {
                    align = (node.getAttribute("align") || "").toLowerCase();
                }
                var text = self.domToWikitext(node, self.options).replace(/ *\n/g, "[[BR]]").replace(/^ +| +$/g, "");
                if (text) {
                    switch (align) {
                        case "left":    _texts.push(text, " ");         break;
                        case "center":  _texts.push("  ", text, "  ");  break;
                        case "right":   _texts.push(" ", text);         break;
                        default:        _texts.push(" ", text, " ");    break;
                    }
                }
                else {
                    _texts.push(" ");
                }
                if (header) {
                    _texts.push("=");
                }
                break;
            case "tr":
                if (quoteDepth > 0) {
                    _texts.push(string(quoteCitation ? ">" : "  ", quoteDepth));
                }
                break;
            case "tt":
                skipNode = node;
                var value = getTextContent(node);
                var text;
                if (value) {
                    if (isTailEscape()) {
                        _texts.push(" ");
                    }
                    if (!/`/.test(value)) {
                        text = "`" + value + "`";
                    }
                    else if (!/\{\{\{|\}\}\}/.test(value)) {
                        text = "{{{" + value + "}}}";
                    }
                    else {
                        text = value.replace(/[^`]+|`+/g, function(m) {
                            return m.charCodeAt(0) != 0x60 ? "`" + m + "`" : "{{{" + m + "}}}";
                        });
                    }
                    pushTextWithDecorations(text, node);
                }
                break;
            case "span":
                if (node.className == "wikianchor" && xmlNamePattern.test(node.id || "")) {
                    skipNode = node;
                    var text = self.domToWikitext(node, self.options).replace(/^ +| +$|\]/g, "");
                    _texts.push("[=#", node.id, text ? " " + text + "]" : "]");
                }
                else {
                    var token = tokenFromSpan(node);
                    if (token) {
                        if (name in wikiInlineTags && isTailEscape()) {
                            _texts.push(" ");
                        }
                        pushOpenToken(token);
                    }
                }
                break;
            case "script":
            case "style":
                skipNode = node;
                break;
            }
            if (name != "#text") {
                openBracket = false;
            }
        }
    }

    function close(name, node) {
        if (skipNode) {
            if (skipNode == node) {
                skipNode = null;
            }
            return;
        }
        var _texts = texts;
        var token = wikiCloseTokens[name];
        if (token === true) {
            // nothing to do
        }
        else if (token) {
            if (name in wikiInlineTags && isTailEscape()) {
                _texts.push(" ");
            }
            _texts.push(token);
        }
        else {
            switch (name) {
            case "p":
                _texts.push(quoteDepth == 0 ? "\n\n" : "\n");
                break;
            case "li":
                if (node.getElementsByTagName("li").length == 0) {
                    _texts.push("\n");
                }
                break;
            case "ul": case "ol":
                listDepth--;
                if (listDepth == 0) {
                    _texts.push("\n");
                }
                break;
            case "pre":
                var text;
                var parentNode = node.parentNode;
                if (parentNode && /^(?:li|dd)$/i.test(parentNode.tagName)) {
                    var nextSibling = node.nextSibling;
                    if (!nextSibling) {
                        text = "\n}}}";
                    }
                    else if (nextSibling.nodeType != 1) {
                        text = "\n}}}\n";
                    }
                    else if (nextSibling.tagName.toLowerCase() == "pre") {
                        text = "\n}}}";
                    }
                    else {
                        text = "\n}}}\n";
                    }
                    if (text.slice(-1) == "\n") {
                        text += listDepth > 0 ? " " + string("  ", listDepth) : "    ";
                    }
                }
                else {
                    text = "\n}}}\n";
                }
                _texts.push(text);
                inCodeBlock = false;
                break;
            case "blockquote":
                quoteDepth--;
                if (quoteDepth == 0) {
                    _texts.push("\n");
                }
                break;
            case "span":
                var token = tokenFromSpan(node);
                if (token) {
                    if (name in wikiInlineTags && isTailEscape()) {
                        _texts.push(" ");
                    }
                    _texts.push(token);
                }
                break;
            case "table":
                if (quoteDepth == 0) {
                    _texts.push("\n");
                }
                break;
            }
        }
        if (/^h[1-6]$/.test(name)) {
            if (xmlNamePattern.test(node.id || "")) {
                _texts.push(" #", node.id);
            }
            _texts.push("\n");
        }
    }

    function iterator(node) {
        var name = null;
        switch (node && node.nodeType) {
        case 1: // element
            name = node.tagName.toLowerCase();
            break;
        case 3: // text
            name = "#text";
            break;
        }

        if (node && last == node.parentNode) {  // down
            // nothing to do
        }
        else if (node && last == node.previousSibling) {    // forward
            close(stack.pop(), last);
        }
        else {  // up, forward
            var tmp = last;
            var nodeParent = node ? node.parentNode : root;
            for ( ; ; ) {
                var parent = tmp.parentNode;
                if (parent == node) {
                    break;
                }
                close(stack.pop(), tmp);
                if (parent == nodeParent || !parent) {
                    if (!node) {
                        return;
                    }
                    break;
                }
                tmp = parent;
            }
        }
        open(name, node);
        stack.push(name);
        last = node;
    }

    this.treeWalk(root, iterator);
    return texts.join("").replace(/^(?: *\n)+|(?: *\n)+$/g, "");
};

if (window.getSelection) {
    TracWysiwyg.prototype.appendBogusLineBreak = function(element) {
        var wikiInlineTags = this.wikiInlineTags;
        var last = element.lastChild;
        for ( ; ; ) {
            if (!last) {
                break;
            }
            if (last.nodeType != 1) {
                return;
            }
            var name = last.tagName.toLowerCase();
            if (name == "br") {
                break;
            }
            if (!(name in wikiInlineTags)) {
                return;
            }
            last = last.lastChild || last.previousSibling;
        }
        var br = this.contentDocument.createElement("br");
        element.appendChild(br);
    };
    TracWysiwyg.prototype.isBogusLineBreak = TracWysiwyg.prototype.isLastChildInBlockNode;
    TracWysiwyg.prototype.insertParagraphOnEnter = function(event) {
        var range = this.getSelectionRange();
        var node = range.endContainer;
        var header = null;
        if (node && node.nodeType == 3 && range.endOffset == node.nodeValue.length) {
            var nextSibling = node.nextSibling;
            if (!nextSibling || nextSibling.tagName.toLowerCase() == "br") {
                while (node) {
                    if (node.nodeType == 1 && /^h[1-6]$/i.exec(node.tagName)) {
                        header = node;
                        break;
                    }
                    node = node.parentNode;
                }
                if (header) {
                    var parent = header.parentNode;
                    var childNodes = parent.childNodes;
                    var length = childNodes.length;
                    for (var offset = 0; offset < length; offset++) {
                        if (childNodes[offset] == header) {
                            offset++;
                            break;
                        }
                    }
                    this.selectRange(parent, offset, parent, offset);
                    this.insertHTML('<p><br></p>');
                    TracWysiwyg.stopEvent(event);
                }
            }
        }
    };
    TracWysiwyg.prototype.tableHTML = function(id, row, col) {
        var html = this._tableHTML(row, col);
        return html.replace(/<td><\/td>/g, '<td><br></td>').replace(/<td>/, '<td id="' + id + '">');
    };
    TracWysiwyg.prototype.insertTableCell = function(row, index) {
        var cell = row.insertCell(index);
        this.appendBogusLineBreak(cell);
        return cell;
    };
    TracWysiwyg.prototype.getFocusNode = function() {
        return this.contentWindow.getSelection().focusNode;
    };
    if (window.opera) {
        TracWysiwyg.prototype.insertLineBreak = function() {
            this.execCommand("inserthtml", "<br>");
        };
        TracWysiwyg.prototype.insertLineBreakOnShiftEnter = null;
    }
    else if (window.getSelection().setBaseAndExtent) {  // Safari 2+
        TracWysiwyg.prototype.insertLineBreak = function() {
            this.execCommand("insertlinebreak");
        };
        TracWysiwyg.prototype.insertLineBreakOnShiftEnter = function(event) {
            this.insertLineBreak();
            TracWysiwyg.stopEvent(event);
        };
    }
    else {  // Firefox 2+
        TracWysiwyg.prototype.insertLineBreak = function() {
            var d = this.contentDocument;
            var event = d.createEvent("KeyboardEvent");
            event.initKeyEvent("keypress", true, true, null, false, false, true, false, 0x000d, 0);
            d.body.dispatchEvent(event);
        };
        TracWysiwyg.prototype.insertLineBreakOnShiftEnter = null;
    }
    if (window.getSelection().removeAllRanges) {
        TracWysiwyg.prototype.selectNode = function(node) {
            var selection = this.contentWindow.getSelection();
            selection.removeAllRanges();
            var range = this.contentDocument.createRange();
            range.selectNode(node);
            selection.addRange(range);
        };
        TracWysiwyg.prototype.selectNodeContents = function(node) {
            var selection = this.contentWindow.getSelection();
            selection.removeAllRanges();
            var range = this.contentDocument.createRange();
            range.selectNodeContents(node);
            selection.addRange(range);
        };
        TracWysiwyg.prototype.selectRange = function(start, startOffset, end, endOffset) {
            var selection = this.contentWindow.getSelection();
            selection.removeAllRanges();
            var range = this.contentDocument.createRange();
            range.setStart(start, startOffset);
            range.setEnd(end, endOffset);
            selection.addRange(range);
        };
        TracWysiwyg.prototype.getNativeSelectionRange = function() {
            var selection = this.contentWindow.getSelection();
            return selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        };
        TracWysiwyg.prototype.expandSelectionToElement = function(arg) {
            if (arg.start || arg.end) {
                var selection = this.contentWindow.getSelection();
                var range = this.getNativeSelectionRange() || this.contentDocument.createRange();
                selection.removeAllRanges();
                if (arg.start) {
                    range.setStartBefore(arg.start);
                }
                if (arg.end) {
                    range.setEndAfter(arg.end);
                }
                selection.addRange(range);
            }
        };
        TracWysiwyg.prototype.insertHTML = function(html) {
            this.execCommand("inserthtml", html);
        };
    }
    else {      // Safari 2
        TracWysiwyg.prototype.selectNode = function(node) {
            var selection = this.contentWindow.getSelection();
            var range = this.contentDocument.createRange();
            range.selectNode(node);
            selection.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
            range.detach();
        };
        TracWysiwyg.prototype.selectNodeContents = function(node) {
            this.selectRange(node, 0, node, node.childNodes.length);
        };
        TracWysiwyg.prototype.selectRange = function(start, startOffset, end, endOffset) {
            var selection = this.contentWindow.getSelection();
            selection.setBaseAndExtent(start, startOffset, end, endOffset);
        };
        TracWysiwyg.prototype.getNativeSelectionRange = function() {
            var selection = this.contentWindow.getSelection();
            if (selection.anchorNode) {
                var range = this.contentDocument.createRange();
                range.setStart(selection.baseNode, selection.baseOffset);
                range.setEnd(selection.extentNode, selection.extentOffset);
                if (range.collapsed && !selection.isCollapsed) {
                    range.setStart(selection.extentNode, selection.extentOffset);
                    range.setEnd(selection.baseNode, selection.baseOffset);
                }
                return range;
            }
            return null;
        };
        TracWysiwyg.prototype.expandSelectionToElement = function(arg) {
            if (arg.start || arg.end) {
                var selection = this.contentWindow.getSelection();
                var range = this.getNativeSelectionRange();
                if (arg.start) {
                    range.setStartBefore(arg.start);
                }
                if (arg.end) {
                    range.setEndAfter(arg.end);
                }
                selection.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
                range.detach();
            }
        };
        TracWysiwyg.prototype.insertHTML = function(html) {
            var range = this.getNativeSelectionRange();
            if (range) {
                var d = this.contentDocument;
                var tmp = d.createRange();
                tmp.setStart(d.body, 0);
                tmp.setEnd(d.body, 0);
                var fragment = tmp.createContextualFragment(html);
                range.deleteContents();
                range.insertNode(fragment);
                range.detach();
                tmp.detach();
            }
        };
    }
    TracWysiwyg.prototype.getSelectionRange = TracWysiwyg.prototype.getNativeSelectionRange;
    TracWysiwyg.prototype.getSelectionText = function() {
        var range = this.getNativeSelectionRange();
        return range ? range.toString() : null;
    };
    TracWysiwyg.prototype.getSelectionHTML = function() {
        var fragment = this.getSelectionFragment();
        var anonymous = this.contentDocument.createElement("div");
        anonymous.appendChild(fragment);
        return anonymous.innerHTML;
    };
    TracWysiwyg.prototype.getSelectionFragment = function() {
        var range = this.getNativeSelectionRange();
        return range ? range.cloneContents() : this.contentDocument.createDocumentFragment();
    };
    TracWysiwyg.prototype.getSelectionPosition = function() {
        var range = this.getNativeSelectionRange();
        var position = { start: null, end: null };
        if (range) {
            position.start = range.startContainer;
            position.end = range.endContainer;
        }
        return position;
    };
    TracWysiwyg.prototype.selectionContainsTagName = function(name) {
        var selection = this.contentWindow.getSelection();
        var range = this.getNativeSelectionRange();
        if (!range) {
            return false;
        }
        var ancestor = range.commonAncestorContainer;
        if (!ancestor) {
            return false;
        }
        if (TracWysiwyg.getSelfOrAncestor(ancestor, name)) {
            return true;
        }
        if (ancestor.nodeType != 1) {
            return false;
        }
        var elements = ancestor.getElementsByTagName(name);
        var length = elements.length;
        for (var i = 0; i < length; i++) {
            if (selection.containsNode(elements[i], true)) {
                return true;
            }
        }
        return false;
    };
}
else if (document.selection) {
    TracWysiwyg.prototype.appendBogusLineBreak = function(element) { };
    TracWysiwyg.prototype.isBogusLineBreak = function(node) { return false };
    TracWysiwyg.prototype.insertParagraphOnEnter = null;
    TracWysiwyg.prototype.insertLineBreak = function() {
        this.insertHTML("<br>");
    };
    TracWysiwyg.prototype.insertLineBreakOnShiftEnter = null;
    TracWysiwyg.prototype.tableHTML = function(id, row, col) {
        var html = this._tableHTML(row, col);
        return html.replace(/<td>/, '<td id="' + id + '">');
    };
    TracWysiwyg.prototype.insertTableCell = function(row, index) {
        return row.insertCell(index);
    };
    TracWysiwyg.prototype.getFocusNode = function() {
        var d = this.contentDocument;
        if (!d.activeElement) {
            this.contentWindow.focus();
        }
        var range = d.selection.createRange();
        var node = range.item ? range.item(0) : range.parentElement();
        return node.ownerDocument == d ? node : null;
    };
    TracWysiwyg.prototype.selectNode = function(node) {
        var d = this.contentDocument;
        var body = d.body;
        var range;
        d.selection.empty();
        try {
            range = body.createControlRange();
            range.addElement(node);
        }
        catch (e) {
            range = body.createTextRange();
            range.moveToElementText(node);
        }
        range.select();
    };
    TracWysiwyg.prototype.selectNodeContents = function(node) {
        var d = this.contentDocument;
        d.selection.empty();
        var range = d.body.createTextRange();
        range.moveToElementText(node);
        range.select();
    };
    TracWysiwyg.prototype.selectRange = function(start, startOffset, end, endOffset) {
        var d = this.contentDocument;
        var body = d.body;
        d.selection.empty();
        var range = endPoint(start, startOffset);
        if (start != end || startOffset != endOffset) {
            range.setEndPoint("EndToEnd", endPoint(end, endOffset));
        }
        range.select();

        function endPoint(node, offset) {
            var range;
            if (node.nodeType == 1) {
                var childNodes = node.childNodes;
                if (offset >= childNodes.length) {
                    range = body.createTextRange();
                    range.moveToElementText(node);
                    range.collapse(false);
                    return range;
                }
                node = childNodes[offset];
                if (node.nodeType == 1) {
                    range = body.createTextRange();
                    range.moveToElementText(node);
                    range.collapse(true);
                    switch (node.tagName.toLowerCase()) {
                    case "table":
                        range.move("character", -1);
                        break;
                    }
                    return range;
                }
                return endPoint(node, 0);
            }
            if (node.nodeType != 3) {
                throw "selectRange: nodeType != @".replace(/@/, node.nodeType);
            }

            range = body.createTextRange();
            var element = node.previousSibling;
            while (element) {
                var nodeType = element.nodeType;
                if (nodeType == 1) {
                    range.moveToElementText(element);
                    range.collapse(false);
                    break;
                }
                if (nodeType == 3) {
                    offset += element.nodeValue.length;
                }
                element = element.previousSibling;
            }
            if (!element) {
                range.moveToElementText(node.parentNode);
                range.collapse(true);
            }
            if (offset != 0) {
                range.move("character", offset);
            }
            return range;
        }
    };
    TracWysiwyg.prototype.getSelectionRange = function() {
        var body = this.contentDocument.body;
        var pseudo = {};
        var start = this.getNativeSelectionRange();
        if (start.item) {
            var element = start.item(0);
            var parent = element.parentNode;
            var childNodes = parent.childNodes;
            var length = childNodes.length;
            for (var i = 0; i < length; i++) {
                if (childNodes[i] == element) {
                    pseudo.startOffset = i;
                    pseudo.endOffset = i + 1;
                    break;
                }
            }
            pseudo.collapsed = false;
            pseudo.startContainer = pseudo.endContainer = parent;
            return pseudo;
        }
        var end = start.duplicate();
        pseudo.collapsed = start.compareEndPoints("StartToEnd", end) == 0;
        start.collapse(true);
        end.collapse(false);

        function nextElement(range) {
            var parent = range.parentElement();
            var childNodes = parent.childNodes;
            var length = childNodes.length;
            for (var i = 0; i < length; i++) {
                var node = childNodes[i];
                if (node.nodeType == 1) {
                    var tmp = body.createTextRange();
                    tmp.moveToElementText(node);
                    if (range.compareEndPoints("EndToStart", tmp) <= 0) {
                        return node;
                    }
                }
            }
            return null;
        }

        function nodeOffset(range, parent, element, index, length) {
            var tmp = body.createTextRange();
            tmp.moveToElementText(element || parent);
            tmp.collapse(!!element);
            tmp.move("character", -index);
            if (!element) {
                length++;
            }
            for ( ; length >= 0; length--) {
                if (tmp.compareEndPoints("EndToStart", range) == 0) {
                    return length;
                }
                tmp.move("character", -1);
            }
            return null;
        }

        function setContainerOffset(range, containerKey, offsetKey) {
            var parent = range.parentElement();
            var element = nextElement(range);
            var index = 0;
            var node = element ? element.previousSibling : parent.lastChild;
            var offset, length;
            while (node && node.nodeType == 3) {
                length = node.nodeValue.length;
                offset = nodeOffset(range, parent, element, index, length);
                if (offset !== null) {
                    pseudo[containerKey] = node;
                    pseudo[offsetKey] = offset;
                    return;
                }
                index += length;
                node = node.previousSibling;
            }
            var childNodes = parent.childNodes;
            length = childNodes.length;
            if (length > 0) {
                pseudo[containerKey] = parent;
                pseudo[offsetKey] = containerKey == "startContainer" ? 0 : length - 1;
                return;
            }
            element = parent;
            parent = element.parentNode;
            childNodes = parent.childNodes;
            length = childNodes.length;
            for (offset = 0; offset < length; offset++) {
                if (element == childNodes[offset]) {
                    pseudo[containerKey] = parent;
                    pseudo[offsetKey] = offset;
                    return;
                }
            }
        }

        setContainerOffset(start, "startContainer", "startOffset");
        setContainerOffset(end, "endContainer", "endOffset");
        return pseudo;
    };
    TracWysiwyg.prototype.getNativeSelectionRange = function() {
        return this.contentDocument.selection.createRange();
    };
    TracWysiwyg.prototype.getSelectionText = function() {
        var range = this.getNativeSelectionRange();
        if (range) {
            return range.item ? range.item(0).innerText : range.text;
        }
        return null;
    };
    TracWysiwyg.prototype.getSelectionHTML = function() {
        var range = this.getNativeSelectionRange();
        if (range) {
            return range.item ? range.item(0).innerHTML : range.htmlText;
        }
        return null;
    };
    TracWysiwyg.prototype.getSelectionFragment = function() {
        var d = this.contentDocument;
        var fragment = d.createDocumentFragment();
        var anonymous = d.createElement("div");
        anonymous.innerHTML = this.getSelectionHTML();
        this.collectChildNodes(fragment, anonymous);
        return fragment;
    };
    TracWysiwyg.prototype.getSelectionPosition = function() {
        var d = this.contentDocument;
        if (!d.activeElement) {
            this.contentWindow.focus();
        }
        var range = d.selection.createRange();
        var startNode = null;
        var endNode = null;
        if (range.item) {
            if (range.item(0).ownerDocument == d) {
                startNode = range.item(0);
                endNode = range.item(range.length - 1);
            }
        }
        else {
            if (range.parentElement().ownerDocument == d) {
                var startRange = range.duplicate();
                startRange.collapse(true);
                startNode = startRange.parentElement();
                var endRange = range.duplicate();
                endRange.collapse(false);
                endNode = endRange.parentElement();
            }
        }
        return { start: startNode, end: endNode };
    };
    TracWysiwyg.prototype.expandSelectionToElement = function(arg) {
        var d = this.contentDocument;
        var body = d.body;
        var range = d.selection.createRange();
        var tmp;
        if (arg.start) {
            tmp = body.createTextRange();
            tmp.moveToElementText(arg.start);
            range.setEndPoint("StartToStart", tmp);
        }
        if (arg.end) {
            tmp = body.createTextRange();
            tmp.moveToElementText(arg.end);
            range.setEndPoint("EndToEnd", tmp);
        }
        if (tmp) {
            range.select();
        }
    };
    TracWysiwyg.prototype.selectionContainsTagName = function(name) {
        var d = this.contentDocument;
        if (!d.activeElement) {
            this.contentWindow.focus();
        }
        var selection = d.selection;
        var range = selection.createRange();
        var parent = range.item ? range.item(0) : range.parentElement();
        if (!parent) {
            return false;
        }
        if (TracWysiwyg.getSelfOrAncestor(parent, name)) {
            return true;
        }
        var elements = parent.getElementsByTagName(name);
        var length = elements.length;
        for (var i = 0; i < length; i++) {
            var testRange = selection.createRange();
            testRange.moveToElementText(elements[i]);
            if (range.compareEndPoints("StartToEnd", testRange) <= 0
                && range.compareEndPoints("EndToStart", testRange) >= 0)
            {
                return true;
            }
        }
        return false;
    };
    TracWysiwyg.prototype.insertHTML = function(html) {
        var range = this.contentDocument.selection.createRange();
        if (/^\s+$/.exec(html)) {
            range.text = html;
        }
        else {
            range.pasteHTML(html.replace(/\t/g, "&#9;"));
        }
    };
}
else {
    TracWysiwyg.prototype.appendBogusLineBreak = function(element) { };
    TracWysiwyg.prototype.insertParagraphOnEnter = null;
    TracWysiwyg.prototype.insertLineBreak = function() { };
    TracWysiwyg.prototype.insertTableCell = function(row, index) { return null };
    TracWysiwyg.prototype.getFocusNode = function() { return null };
    TracWysiwyg.prototype.selectNode = function(node) { };
    TracWysiwyg.prototype.selectNodeContents = function(node) { return null };
    TracWysiwyg.prototype.selectRange = function(start, startOffset, end, endOffset) { };
    TracWysiwyg.prototype.getSelectionRange = function() { return null };
    TracWysiwyg.prototype.getNativeSelectionRange = function() { return null };
    TracWysiwyg.prototype.getSelectionText = function() { return null };
    TracWysiwyg.prototype.getSelectionHTML = function() { return null };
    TracWysiwyg.prototype.getSelectionFragment = function() { return null };
    TracWysiwyg.prototype.getSelectionPosition = function() { return null };
    TracWysiwyg.prototype.expandSelectionToElement = function(arg) { };
    TracWysiwyg.prototype.selectionContainsTagName = function(name) { return false };
    TracWysiwyg.prototype.insertHTML = function(html) { };
}

TracWysiwyg.prototype._treeWalkEmulation = function(root, iterator) {
    if (!root.firstChild) {
        iterator(null);
        return;
    }
    var element = root;
    var tmp;
    while (element) {
        if (tmp = element.firstChild) {
            element = tmp;
        }
        else if (tmp = element.nextSibling) {
            element = tmp;
        }
        else {
            for ( ; ; ) {
                element = element.parentNode;
                if (element == root || !element) {
                    iterator(null);
                    return;
                }
                if (tmp = element.nextSibling) {
                    element = tmp;
                    break;
                }
            }
        }
        iterator(element);
    }
};

if (document.createTreeWalker) {
    TracWysiwyg.prototype.treeWalk = function(root, iterator) {
        var walker = root.ownerDocument.createTreeWalker(
            root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, true);
        while (walker.nextNode()) {
            iterator(walker.currentNode);
        }
        iterator(null);
    };
}
else {
    TracWysiwyg.prototype.treeWalk = TracWysiwyg.prototype._treeWalkEmulation;
}

TracWysiwyg.count = 0;
TracWysiwyg.tracPaths = null;

TracWysiwyg.getTracPaths = function() {
    var stylesheets = [];
    var paths = { stylesheets: stylesheets };

    var d = document;
    var head = d.getElementsByTagName("head")[0];
    var links = head.getElementsByTagName("link");
    var length = links.length;
    for (var i = 0; i < length; i++) {
        var link = links[i];
        var href = link.getAttribute("href") || "";
        var type = link.getAttribute("type") || "";
        switch ((link.getAttribute("rel") || "").toLowerCase()) {
        case "tracwysiwyg.base":
            paths.base = href;
            break;
        case "tracwysiwyg.stylesheet":
            stylesheets.push(href);
            break;
        case "search":
            if (type) {
                paths.search = href;
            }
            break;
        }
    }
    if (paths.base && stylesheets.length > 0) {
        if (!paths.search) {
            paths.search = paths.base.replace(/\/?$/, "/search");
        }
        return paths;
    }
    return null;
};

TracWysiwyg.getOptions = function() {
    var options = {};
    if (typeof window._tracwysiwyg != "undefined") {
        options = _tracwysiwyg;
    }
    return options;
};

TracWysiwyg.getEditorMode = function() {
    if (TracWysiwyg.editorMode) {
        return TracWysiwyg.editorMode;
    }

    var mode = null;
    var cookies = (document.cookie || "").split(";");
    var length = cookies.length;
    for (var i = 0; i < length; i++) {
        var match = /^\s*tracwysiwyg=(\S*)/.exec(cookies[i]);
        if (match) {
            switch (match[1]) {
            case "wysiwyg":
                mode = match[1];
                break;
            default:    // "textarea"
                mode = null;
                break;
            }
            break;
        }
    }

    TracWysiwyg.editorMode = mode || "textarea";
    return TracWysiwyg.editorMode;
};

TracWysiwyg.setEditorMode = function(mode) {
    switch (mode) {
    case "wysiwyg":
        break;
    default:    // "textarea"
        mode = "textarea";
        break;
    }
    TracWysiwyg.editorMode = mode;

    var now = new Date();
    if (!/\/$/.test(TracWysiwyg.tracPaths.base)) {
        expires = new Date(now.getTime() - 86400000);
        pieces = [ "tracwysiwyg=",
            "path=" + TracWysiwyg.tracPaths.base + "/",
            "expires=" + expires.toUTCString() ];
        document.cookie = pieces.join("; ");
    }
    var expires = new Date(now.getTime() + 365 * 86400 * 1000);
    var pieces = [ "tracwysiwyg=" + mode,
        "path=" + TracWysiwyg.tracPaths.base,
        "expires=" + expires.toUTCString() ];
    document.cookie = pieces.join("; ");
};

TracWysiwyg.removeEvent = function(element, type, func) {
    jQuery(element).unbind(type, func);
};

TracWysiwyg.stopEvent = function(event) {
    if (event.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
    }
    else {
        event.returnValue = false;
        event.cancelBubble = true;
    }
};

TracWysiwyg.setStyle = function(element, object) {
    var style = element.style;
    for (var name in object) {
        style[name] = object[name];
    }
};

if (document.defaultView) {
    TracWysiwyg.getStyle = function(element, name) {
        var value = element.style[name];
        if (!value) {
            var style = element.ownerDocument.defaultView.getComputedStyle(element, null)
            value = style ? style[name] : null;
        }
        return value;
    };
}
else {
    TracWysiwyg.getStyle = function(element, name) {
        return element.style[name] || element.currentStyle[name];
    };
}

TracWysiwyg.elementPosition = function(element) {
    function vector(left, top) {
        var value = [ left, top ];
        value.left = left;
        value.top = top;
        return value;
    }
    var position = TracWysiwyg.getStyle(element, "position");
    var left = 0, top = 0;
    for (var node = element; node; node = node.offsetParent) {
        left += node.offsetLeft || 0;
        top += node.offsetTop || 0;
    }
    if (position != "absolute") {
        return vector(left, top);
    }
    var offset = TracWysiwyg.elementPosition(element.offsetParent);
    return vector(left - offset.left, top - offset.top);
};

TracWysiwyg.getSelfOrAncestor = function(element, name) {
    var target = element;
    var d = element.ownerDocument;
    if (name instanceof RegExp) {
        while (target && target != d) {
            switch (target.nodeType) {
            case 1: // element
                if (name.test(target.tagName.toLowerCase())) {
                    return target;
                }
                break;
            case 11: // fragment
                return null;
            }
            target = target.parentNode;
        }
    }
    else {
        name = name.toLowerCase();
        while (target && target != d) {
            switch (target.nodeType) {
            case 1: // element
                if (target.tagName.toLowerCase() == name) {
                    return target;
                }
                break;
            case 11: // fragment
                return null;
            }
            target = target.parentNode;
        }
    }
    return null;
};

TracWysiwyg.quickSearchURL = function(link) {
    if (!/^(?:(?:https?|ftp|mailto|file):|[\/.#])/.test(link)) {
        link = TracWysiwyg.tracPaths.search + "?q=" + encodeURIComponent(link);
    }
    return link;
};

TracWysiwyg.getTextContent = (function() {
    var anonymous = document.createElement("div");
    if (typeof anonymous.textContent != "undefined") {
        return function(element) { return element.textContent };
    }
    else if (typeof anonymous.innerText != "undefined") {
        return function(element) { return element.innerText };
    }
    else {
        return function(element) { return null };
    }
})();

TracWysiwyg.initialize = function() {
    if ("replace".replace(/[a-e]/g, function(m) { return "*" }) != "r*pl***") {
        return;
    }
    if (typeof document.designMode == "undefined") {
        return;
    }
    TracWysiwyg.tracPaths = TracWysiwyg.getTracPaths();
    if (!TracWysiwyg.tracPaths) {
        return;
    }
    var options = TracWysiwyg.getOptions();
    var textareas = document.getElementsByTagName("textarea");
    for (var i = 0; i < textareas.length; i++) {
        var textarea = textareas[i];
        if (/\bwikitext\b/.test(textarea.className || "")) {
            new TracWysiwyg(textarea, options);
        }
    }
};


/***************************************
*
*	Javascript Textile->HTML conversion
*
*	ben@ben-daglish.net (with thanks to John Hughes for improvements)
*   Issued under the "do what you like with it - I take no respnsibility" licence
****************************************/

var inpr,inbq,inbqq,html;
var aliases = new Array;
var alg={'>':'right','<':'left','=':'center','<>':'justify','~':'bottom','^':'top'};
var ent={"'":"&#8217;"," - ":" &#8211; ","--":"&#8212;"," x ":" &#215; ","\\.\\.\\.":"&#8230;","\\(C\\)":"&#169;","\\(R\\)":"&#174;","\\(TM\\)":"&#8482;"};
var tags={"b":"\\*\\*","i":"__","em":"_","strong":"\\*","cite":"\\?\\?","sup":"\\^","sub":"~","span":"\\%","del":"-","code":"@","ins":"\\+","del":"-"};
var le="\n\n";
var lstlev=0,lst="",elst="",intable=0,mm="";
var para = /^p(\S*)\.\s*(.*)/;
var rfn = /^fn(\d+)\.\s*(.*)/;
var bq = /^bq\.(\.)?\s*/;
var table=/^table\s*{(.*)}\..*/;
var trstyle = /^\{(\S+)\}\.\s*\|/;

function convert(t) {
	var lines = t.split(/\r?\n/);
	html="";
	inpr=inbq=inbqq=0;
	for(var i=0;i<lines.length;i++) {
		if(lines[i].indexOf("[") == 0) {
			var m = lines[i].indexOf("]");
			aliases[lines[i].substring(1,m)]=lines[i].substring(m+1);
		}
	}
	for(i=0;i<lines.length;i++) {
		if (lines[i].indexOf("[") == 0) {continue;}
		if(mm=para.exec(lines[i])){stp(1);inpr=1;html += lines[i].replace(para,"<p"+make_attr(mm[1])+">"+prep(mm[2]));continue;}
		if(mm = /^h(\d)(\S*)\.\s*(.*)/.exec(lines[i])){stp(1);html += tag("h"+mm[1],make_attr(mm[2]),prep(mm[3]))+le;continue;}
		if(mm=rfn.exec(lines[i])){stp(1);inpr=1;html+=lines[i].replace(rfn,'<p id="fn'+mm[1]+'"><sup>'+mm[1]+'<\/sup>'+prep(mm[2]));continue;}
		if (lines[i].indexOf("*") == 0) {lst="<ul>";elst="<\/ul>";}
		else if (lines[i].indexOf("#") == 0) {lst="<\ol>";elst="<\/ol>";}
		else {while (lstlev > 0) {html += elst;if(lstlev > 1){html += "<\/li>";}else{html+="\n";}html+="\n";lstlev--;}lst="";}
		if(lst) {
			stp(1);
			var m = /^([*#]+)\s*(.*)/.exec(lines[i]);
			var lev = m[1].length;
			while(lev < lstlev) {html += elst+"<\/li>\n";lstlev--;}
			while(lstlev < lev) {html=html.replace(/<\/li>\n$/,"\n");html += lst;lstlev++;}
			html += tag("li","",prep(m[2]))+"\n";
			continue;
		}
		if (lines[i].match(table)){stp(1);intable=1;html += lines[i].replace(table,'<table style="$1;">\n');continue;}
		if ((lines[i].indexOf("|") == 0)  || (lines[i].match(trstyle)) ) {
			stp(1);
			if(!intable) {html += "<table>\n";intable=1;}
			var rowst="";var trow="";
			var ts=trstyle.exec(lines[i]);
			if(ts){rowst=qat('style',ts[1]);lines[i]=lines[i].replace(trstyle,"\|");}
			var cells = lines[i].split("|");
			for(j=1;j<cells.length-1;j++) {
				var ttag="td";
				if(cells[j].indexOf("_.")==0) {ttag="th";cells[j]=cells[j].substring(2);}
				cells[j]=prep(cells[j]);
				var al=/^([<>=^~\/\\\{]+.*?)\.(.*)/.exec(cells[j]);
				var at="",st="";
				if(al != null) {
					cells[j]=al[2];
					var cs= /\\(\d+)/.exec(al[1]);if(cs != null){at +=qat('colspan',cs[1]);}
					var rs= /\/(\d+)/.exec(al[1]);if(rs != null){at +=qat('rowspan',rs[1]);}
					var va= /([\^~])/.exec(al[1]);if(va != null){st +="vertical-align:"+alg[va[1]]+";";}
					var ta= /(<>|=|<|>)/.exec(al[1]);if(ta != null){st +="text-align:"+alg[ta[1]]+";";}
					var is= /\{([^\}]+)\}/.exec(al[1]);if(is != null){st +=is[1];}
					if(st != ""){at+=qat('style',st);}					
				}
				trow += tag(ttag,at,cells[j]);
			}
			html += "\t"+tag("tr",rowst,trow)+"\n";
			continue;
		}
		if(intable) {html += "<\/table>"+le;intable=0;}

		if (lines[i]=="") {stp();}
		else if (!inpr) {
			if(mm=bq.exec(lines[i])){lines[i]=lines[i].replace(bq,"");html +="<blockquote>";inbq=1;if(mm[1]) {inbqq=1;}}
			html += "<p>"+prep(lines[i]);inpr=1;
		}
		else {html += prep(lines[i]);}
	}
	stp();
	return html;
}

function prep(m){
	for(i in ent) {m=m.replace(new RegExp(i,"g"),ent[i]);}
	for(i in tags) {
		m = make_tag(m,RegExp("^"+tags[i]+"(.+?)"+tags[i]),i,"");
		m = make_tag(m,RegExp(" "+tags[i]+"(.+?)"+tags[i]),i," ");
	}
	m=m.replace(/\[(\d+)\]/g,'<sup><a href="#fn$1">$1<\/a><\/sup>');
	m=m.replace(/([A-Z]+)\((.*?)\)/g,'<acronym title="$2">$1<\/acronym>');
	m=m.replace(/\"([^\"]+)\":((http|https|mailto):\S+)/g,'<a href="$2">$1<\/a>');
	m = make_image(m,/!([^!\s]+)!:(\S+)/);
	m = make_image(m,/!([^!\s]+)!/);
	m=m.replace(/"([^\"]+)":(\S+)/g,function($0,$1,$2){return tag("a",qat('href',aliases[$2]),$1)});
	m=m.replace(/(=)?"([^\"]+)"/g,function($0,$1,$2){return ($1)?$0:"&#8220;"+$2+"&#8221;"});
	return m;
}

function make_tag(s,re,t,sp) {
	while(m = re.exec(s)) {
		var st = make_attr(m[1]);
		m[1]=m[1].replace(/^[\[\{\(]\S+[\]\}\)]/g,"");
		m[1]=m[1].replace(/^[<>=()]+/,"");
		s = s.replace(re,sp+tag(t,st,m[1]));
	}
	return s;
}

function make_image(m,re) {
	var ma = re.exec(m);
	if(ma != null) {
		var attr="";var st="";
		var at = /\((.*)\)$/.exec(ma[1]);
		if(at != null) {attr = qat('alt',at[1])+qat("title",at[1]);ma[1]=ma[1].replace(/\((.*)\)$/,"");}
		if(ma[1].match(/^[><]/)) {st = "float:"+((ma[1].indexOf(">")==0)?"right;":"left;");ma[1]=ma[1].replace(/^[><]/,"");}
		var pdl = /(\(+)/.exec(ma[1]);if(pdl){st+="padding-left:"+pdl[1].length+"em;";}
		var pdr = /(\)+)/.exec(ma[1]);if(pdr){st+="padding-right:"+pdr[1].length+"em;";}
		if(st){attr += qat('style',st);}
		var im = '<img src="'+ma[1]+'"'+attr+" />";
		if(ma.length >2) {im=tag('a',qat('href',ma[2]),im);}
		m = m.replace(re,im);
	}
	return m;
}

function make_attr(s) {
	var st="";var at="";
	if(!s){return "";}
	var l=/\[(\w\w)\]/.exec(s);
	if(l != null) {at += qat('lang',l[1]);}
	var ci=/\((\S+)\)/.exec(s);
	if(ci != null) {
		s = s.replace(/\((\S+)\)/,"");
		at += ci[1].replace(/#(.*)$/,' id="$1"').replace(/^(\S+)/,' class="$1"');
	}
	var ta= /(<>|=|<|>)/.exec(s);if(ta){st +="text-align:"+alg[ta[1]]+";";}
	var ss=/\{(\S+)\}/.exec(s);if(ss){st += ss[1];if(!ss[1].match(/;$/)){st+= ";";}}
	var pdl = /(\(+)/.exec(s);if(pdl){st+="padding-left:"+pdl[1].length+"em;";}
	var pdr = /(\)+)/.exec(s);if(pdr){st+="padding-right:"+pdr[1].length+"em;";}
	if(st) {at += qat('style',st);}
	return at;
}

function qat(a,v){return ' '+a+'="'+v+'"';}
function tag(t,a,c) {return "<"+t+a+">"+c+"</"+t+">";}
function stp(b){if(b){inbqq=0;}if(inpr){html+="<\/p>"+le;inpr=0;}if(inbq && !inbqq){html+="<\/blockquote>"+le;inbq=0;}}

function addEvent(element, type, listener) {
    if (element.addEventListener) {
        element.addEventListener(type, listener, false);
        return true;
    }
    else if (element.attachEvent) {
        return element.attachEvent("on" + type, listener);
    }
    return false;
}

function getAncestorByTagName(node, tag) {
    tag = tag.toLowerCase();
    do {
        node = node.parentNode;
    } while (node.nodeType == 1 && node.tagName.toLowerCase() != tag);

    return node.nodeType == 1 ? node : null;
}

TracWysiwyg.tracPaths = { base: ".", search: "./search", stylesheets: [] };
var options = TracWysiwyg.getOptions();
