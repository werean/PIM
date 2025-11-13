using System.ComponentModel.DataAnnotations;

namespace CSharp.DTOs
{
    public class CreateKnowledgeBaseArticleDto
    {
        [Required(ErrorMessage = "Título é obrigatório")]
        [MaxLength(200, ErrorMessage = "Título deve ter no máximo 200 caracteres")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Corpo do artigo é obrigatório")]
        public string Body { get; set; } = string.Empty;

        public int? TicketId { get; set; }
    }

    public class GenerateArticleFromTicketDto
    {
        [Required]
        public int TicketId { get; set; }
    }

    public class GeneratedArticleDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateKnowledgeBaseArticleDto
    {
        [Required(ErrorMessage = "Título é obrigatório")]
        [MaxLength(200, ErrorMessage = "Título deve ter no máximo 200 caracteres")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Corpo do artigo é obrigatório")]
        public string Body { get; set; } = string.Empty;
    }

    public class KnowledgeBaseArticleDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public Guid CreatedBy { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class KnowledgeBaseArticleListDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
