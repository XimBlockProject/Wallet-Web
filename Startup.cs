using myximblockwallet.org.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace myximblockwallet.org
{
	public class Startup
	{
		public Startup(IConfiguration configuration) => Configuration = configuration;
		public IConfiguration Configuration { get; }

		public void ConfigureServices(IServiceCollection services)
		{
			services.AddMvc();
			services.AddSingleton<XimBlockNode>();
		}

		public void Configure(IApplicationBuilder app, IHostingEnvironment env)
		{
			if (env.IsDevelopment())
				app.UseDeveloperExceptionPage();
			else
				app.UseExceptionHandler("/Home/Error");
			app.Use(async (context, next) =>
			{
				if (context.Request.IsHttps)
					await next();
				else
					context.Response.Redirect("https://" + context.Request.Host + context.Request.Path);
			});
			app.UseStaticFiles();
			app.UseMvc(routes =>
			{
				//https://stackoverflow.com/questions/12828317/mvc-4-remove-home-from-base-route
				routes.MapRoute("OnlyAction", "{action}", new { controller = "Home", action = "Index" });
				routes.MapRoute(name: "default", template: "{controller=Home}/{action=Index}/{id?}");
				routes.MapSpaFallbackRoute(name: "spa-fallback",
					defaults: new { controller = "Home", action = "Index" });
			});
		}
	}
}