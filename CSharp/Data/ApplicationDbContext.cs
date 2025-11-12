// Equivalente à configuração do Prisma/Knex no backend TS
using Microsoft.EntityFrameworkCore;
using CSharp.Entities;

namespace CSharp.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Attachment> Attachments { get; set; }
        public DbSet<TicketAISession> TicketAISessions { get; set; }
        public DbSet<AIMessage> AIMessages { get; set; }
        public DbSet<KnowledgeBaseArticle> KnowledgeBaseArticles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // User
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username);
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
            modelBuilder.Entity<User>()
                .Property(u => u.Role)
                .HasConversion<int>();
            // Corrige tipo da coluna Id para uniqueidentifier no SQL Server
            modelBuilder.Entity<User>()
                .Property(u => u.Id)
                .HasColumnType("uniqueidentifier");

            // Ticket
            modelBuilder.Entity<Ticket>()
                .Property(t => t.Urgency)
                .HasConversion<int>();
            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.User)
                .WithMany(u => u.Tickets)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Comment
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Ticket)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Attachment
            modelBuilder.Entity<Attachment>()
                .HasOne(a => a.Ticket)
                .WithMany(t => t.Attachments)
                .HasForeignKey(a => a.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            // TicketAISession
            modelBuilder.Entity<TicketAISession>()
                .HasOne(s => s.Ticket)
                .WithMany()
                .HasForeignKey(s => s.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            // AIMessage
            modelBuilder.Entity<AIMessage>()
                .HasOne(m => m.Ticket)
                .WithMany()
                .HasForeignKey(m => m.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<AIMessage>()
                .HasOne(m => m.User)
                .WithMany()
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<AIMessage>()
                .HasIndex(m => m.TicketId); // Index para performance

            // KnowledgeBaseArticle
            modelBuilder.Entity<KnowledgeBaseArticle>()
                .HasOne(k => k.CreatedByUser)
                .WithMany()
                .HasForeignKey(k => k.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<KnowledgeBaseArticle>()
                .HasIndex(k => k.CreatedAt);
        }
    }
}
