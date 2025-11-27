using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models; // <- ya lo tenías

var builder = WebApplication.CreateBuilder(args);

// =======================
//   AUTENTICACIÓN JWT
// =======================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])
            )
        };
    });

// =======================
//   CONTROLADORES
// =======================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// =======================
//          CORS
// =======================
// Política para permitir que tu front (login.html, registro.html, index.html)
// pueda llamar a http://localhost:5224 sin que el navegador bloquee por CORS.
const string DevCors = "DevCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: DevCors, policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
        // Si quieres limitar:
        // .WithOrigins("http://localhost:5500")
        //   .AllowAnyHeader()
        //   .AllowAnyMethod();
    });
});

// =======================
//        SWAGGER
// =======================
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "KioscoDigital.WebAPI", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Autenticación JWT. Escribe 'Bearer' [espacio] y tu token.\r\n\r\nEjemplo: \"Bearer 12345abcdef\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

var app = builder.Build();

// =======================
//      PIPELINE HTTP
// =======================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// OJO: lo tienes comentado para usar solo HTTP en 5224, está bien así
// app.UseHttpsRedirection();

// 🔹 PRIMERO CORS (antes de Auth / Authorization)
app.UseCors(DevCors);

// Luego autenticación/autorización
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
