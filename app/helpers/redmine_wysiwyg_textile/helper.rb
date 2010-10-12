
require "i18n.rb"

module RedmineWysiwygTextile
  module Helper
    unloadable
    
    def wikitoolbar_for(field_id)
      if (field_id=='content_text')
        # only for wiki pages for now
        wikitoolbar_for_wysiwyg(field_id)
      else
        wikitoolbar_for_non_wysiwyg(field_id)
      end
    end
    
    def wikitoolbar_for_non_wysiwyg(field_id)
          # Is there a simple way to link to a public resource?
          url = "#{Redmine::Utils.relative_url_root}/help/wiki_syntax.html"
          
          help_link = l(:setting_text_formatting) + ': ' +
            link_to(l(:label_help), url,
                    :onclick => "window.open(\"#{ url }\", \"\", \"resizable=yes, location=no, width=300, height=640, menubar=no, status=no, scrollbars=yes\"); return false;")
      
          javascript_include_tag('jstoolbar/jstoolbar') +
            javascript_include_tag('jstoolbar/textile') +
            javascript_include_tag("jstoolbar/lang/jstoolbar-#{current_language.to_s.downcase}") +
          javascript_tag("var wikiToolbar = new jsToolBar($('#{field_id}')); wikiToolbar.setHelpLink('#{help_link}'); wikiToolbar.draw();")
    end
    
    def wikitoolbar_for_wysiwyg(field_id)
       file = "#{Redmine::Utils.relative_url_root}/help/wiki_syntax.html"
       help_link = l(:setting_text_formatting) + ': ' +
       link_to(l(:label_help), file,
              :onclick => "window.open(\"#{file}\", \"\", \"resizable=yes, location=no, width=800, height=640, menubar=no, status=no, scrollbars=yes\"); return false;")
    # tinymce and jstoolbar
        javascript_include_tag('jstoolbar/jstoolbar') +
        javascript_include_tag('jstoolbar/textile') +
        javascript_include_tag("jstoolbar/lang/jstoolbar-#{current_language.to_s.downcase}") +
        javascript_include_tag('/tinymce/jscripts/tiny_mce/tiny_mce.js', :plugin => 'redmine_wysiwyg_textile') +
        javascript_tag("
            var tinyenabled=false;
            function setuptinymce() {
             tinyMCE.init({
               mode : 'specific_textareas',
               editor_selector : 'wiki-edit',
               formats : {strikethrough : {inline : 'del'}, 
                          underline : {inline : 'ins'} },
               theme : 'advanced',
               plugins : 'table',
               theme_advanced_buttons1: 'bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,formatselect',
               theme_advanced_buttons3_add : 'tablecontrols',
               table_styles : 'Header 1=header1;Header 2=header2;Header 3=header3',
               table_cell_styles : 'Header 1=header1;Header 2=header2;Header 3=header3;Table Cell=tableCel1',
               table_row_styles : 'Header 1=header1;Header 2=header2;Header 3=header3;Table Row=tableRow1',
               table_cell_limit : 100,
               table_row_limit : 5,
               table_col_limit : 5,
               theme_advanced_toolbar_location : 'top',
               theme_advanced_toolbar_align : 'left',
               theme_advanced_resizing : true
              });
            }
            function toggleEditor(id,DisplayTiny) {
                if (DisplayTiny==1 && tinyenabled==false) {
                    new Ajax.Request('/convert/wysiwygtotextiletohtml', {asynchronous:false, evalScripts:false, method:'post', onSuccess:function(request){UpdateFile(request)}, parameters:$('#{field_id}').serialize()});
                    setuptinymce();
                    tinyenabled=true;
                    the_jstoolbar.toolbar.style.display = 'none';
                    return;
                }
                if (!tinyMCE.get(id)) {
                  if (DisplayTiny==1) {
                    new Ajax.Request('/convert/wysiwygtotextiletohtml', {asynchronous:false, evalScripts:false, method:'post', onSuccess:function(request){UpdateFile(request)}, parameters:$('#{field_id}').serialize()});
                    the_jstoolbar.toolbar.style.display = 'none';
                    tinyMCE.execCommand('mceAddControl', false, id);
                  }
                }
                else {
                   if (DisplayTiny==0) {
                    tinyMCE.execCommand('mceRemoveControl', false, id);
                    new Ajax.Request('/convert/wysiwygtohtmltotextile', {asynchronous:false, evalScripts:false, method:'post', onSuccess:function(request){UpdateFile(request)}, parameters:$('#{field_id}').serialize()});
                    the_jstoolbar.toolbar.style.display = 'block';
                   }
                }
            }
            function UpdateFile(TheText) {
               var text1 = document.getElementById('#{field_id}');
               text1.value = TheText.responseText;
               if (tinyenabled==true) {
                    tinyMCE.get('#{field_id}').setContent(TheText.responseText);
               }
               return true;
            }
            function UpdatePreviewText(TheText) {
               var text2 = document.getElementById('#{:preview}');
               text2.innerHTML = TheText.responseText;
            }
        ") + 
        javascript_tag("
        function Tinymcesubmit(id) {              
               if (tinyMCE.get(id)) {
                    tinyMCE.execCommand('mceRemoveControl', false, id);
                    new Ajax.Request('/convert/wysiwygtohtmltotextile', {asynchronous:false, evalScripts:false, method:'post', onSuccess:function(request){UpdateFile(request)}, parameters:$('#{field_id}').serialize()});
                    the_jstoolbar.toolbar.style.display = 'block';
               }
            } 
            function AddWikiformSubmit(textarea) {
              var aTextArea=document.getElementById(textarea);
              if (aTextArea) {
                  aform=aTextArea.form;
                  if (aform) {
                     aform.onsubmit=function(){return Tinymcesubmit(textarea);};
                  }
              }
             }
          ") +
         "<form>
            <Input type = radio Name = \"textilewysiwyg\" CHECKED onClick=\"javascript:toggleEditor('#{field_id}',0)\">textile
            <Input type = radio Name = \"textilewysiwyg\" onClick=\"javascript:toggleEditor('#{field_id}',1)\">wysiwyg
            </form>
            <div id='workarea' class='wiki'></div>" +
            javascript_tag("var the_jstoolbar = new jsToolBar($('#{field_id}')); the_jstoolbar.setHelpLink('#{help_link}'); the_jstoolbar.draw();AddWikiformSubmit('#{field_id}');")
    end
    
    def initial_page_content(page)
       "h1. #{ERB::Util.html_escape page.pretty_title}"
    end

    def heads_for_wiki_formatter
      #stylesheet_link_tag('/tiny_mce/themes/advanced/skins/default/wysiwygtextile/content.css', :plugin => 'redmine_wysiwyg_textile' ) +
      #stylesheet_link_tag('/tiny_mce/themes/advanced/skins/default/wysiwygtextile/ui.css', :plugin => 'redmine_wysiwyg_textile' ) +
      #stylesheet_link_tag('/tiny_mce/themes/advanced/skins/default/wysiwygtextile/dialog.css', :plugin => 'redmine_wysiwyg_textile' ) +
      stylesheet_link_tag('jstoolbar')
    end
  end
end
