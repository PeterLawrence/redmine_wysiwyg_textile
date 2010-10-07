#custom routes for this plugin
ActionController::Routing::Routes.draw do |map|
  map.with_options :controller => 'convert' do |convert_routes|
    convert_routes.connect "convert/wysiwygtohtmltotextile", :conditions => { :method => [:post, :put] }, :action => 'wysiwygtohtmltotextile'
    convert_routes.connect "convert/wysiwygtotextiletohtml", :conditions => { :method => [:post, :put] }, :action => 'wysiwygtotextiletohtml'
  end
end