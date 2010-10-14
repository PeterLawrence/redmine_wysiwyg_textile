#
# Redmine Wysiwyg Textile Editor
#
# P.J.Lawrence October 2010
#
require 'redmine'

RAILS_DEFAULT_LOGGER.info 'Starting Wysiwyg Textile for Redmine'

Redmine::Plugin.register :redmine_wysiwyg_textile do
    name 'Redmine Wysiwyg Textile'
    author 'P.J. Lawrence'
    description 'A TinyMCE test application for Textile wiki pages'
    version '0.14'
    
    wiki_format_provider 'textile wysiwyg', RedmineWysiwygTextile::WikiFormatter, \
                                             RedmineWysiwygTextile::Helper
end








