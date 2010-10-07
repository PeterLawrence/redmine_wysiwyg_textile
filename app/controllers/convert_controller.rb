require 'html2textile'
require 'sgml-parser'
require 'redcloth3'

# P.J.Lawrence October 2010

class HTMLFormatter< RedCloth3
        include ActionView::Helpers::TagHelper
        
        RULES = [:textile, :block_markdown_rule]
        
        def initialize(*args)
          super
          self.hard_breaks=true
          self.no_span_caps=true
          self.filter_styles=true
        end
        
        def to_html(*rules)
          super(*RULES).to_s
        end
  
      private
  
        # Patch for RedCloth.  Fixed in RedCloth r128 but _why hasn't released it yet.
        # <a href="http://code.whytheluckystiff.net/redcloth/changeset/128">http://code.whytheluckystiff.net/redcloth/changeset/128</a>
        def hard_break( text ) 
          text.gsub!( /(.)\n(?!\n|\Z|>| *([#*=]+(\s|$)|[{|]))/, "\\1<br />" ) if hard_breaks
        end
        
        AUTO_LINK_RE = %r{
                        (                          # leading text
                          <\w+.*?>|                # leading HTML tag, or
                          [^=<>!:'"/]|             # leading punctuation, or 
                          ^                        # beginning of line
                        )
                        (
                          (?:https?://)|           # protocol spec, or
                          (?:s?ftps?://)|
                          (?:www\.)                # www.*
                        )
                        (
                          (\S+?)                   # url
                          (\/)?                    # slash
                        )
                        ([^\w\=\/;\(\)]*?)               # post
                        (?=<|\s|$)
                       }x unless const_defined?(:AUTO_LINK_RE)
  
    end

class ConvertController < ApplicationController
  unloadable
      
  def wysiwygtohtmltotextile
    @text = params[:content][:text] 
    # name="content[text]" --- wiki page
    # name="issue[description]" -- issue
    # name="notes" -- note
    # name="settings[mail_handler_body_delimiters]" - settings
    # name="project[description]"
    # name="message[content]" -- forum
    htmlparser = HTMLToTextileParser.new
    htmlparser.feed(@text)
    @text=htmlparser.to_textile
    render :partial => 'convert'
  end
  
  def wysiwygtotextiletohtml
    @text=params[:content][:text]
    #@text=RedCloth3.new(params[:content][:text]).to_html
    #@text = @text.gsub(/(\r?\n|\r\n?)/, "\n> ") + "\n\n"
    @text=HTMLFormatter.new(@text).to_html
    render :partial => 'convert'
  end
end
