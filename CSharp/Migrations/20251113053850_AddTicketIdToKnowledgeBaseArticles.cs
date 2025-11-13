using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIM.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketIdToKnowledgeBaseArticles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TicketId",
                table: "KnowledgeBaseArticles",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_KnowledgeBaseArticles_TicketId",
                table: "KnowledgeBaseArticles",
                column: "TicketId");

            migrationBuilder.AddForeignKey(
                name: "FK_KnowledgeBaseArticles_Tickets_TicketId",
                table: "KnowledgeBaseArticles",
                column: "TicketId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KnowledgeBaseArticles_Tickets_TicketId",
                table: "KnowledgeBaseArticles");

            migrationBuilder.DropIndex(
                name: "IX_KnowledgeBaseArticles_TicketId",
                table: "KnowledgeBaseArticles");

            migrationBuilder.DropColumn(
                name: "TicketId",
                table: "KnowledgeBaseArticles");
        }
    }
}
