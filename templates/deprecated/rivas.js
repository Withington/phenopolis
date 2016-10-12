
function gene_chart(data, new_data, variant_data, _transcript) {
    var coords = 'pos_coding_noutr';
    var coding_coordinate_params = get_coding_coordinate_params(_transcript, true);
    var chart_width = gene_chart_width;
    var metric = '-log10pvalue';
    var metricor = 'odds_ratio';
    var exon_x_scale = d3.scale.linear().domain([0, coding_coordinate_params.size]).range([0, chart_width]);
    var maxn = d3.max(data, function(d) { return d[metric] }) + 2;
    var maxnor = d3.max(data, function(d) { return d[metricor] }) + .3;
    var minor =  d3.min(data, function(d) { return d[metricor] }) - .3;
    var minor = minor < 0 ? 0 : minor; 
    var max_cov = (metric == '-log10pvalue') ? maxn : maxnor;
    var min_cov = (metric == '-log10pvalue') ? 0 : minor;

    var y = d3.scale.linear().domain([min_cov, max_cov]).range([gene_chart_height, 0]);

    var yAxis = d3.svg.axis().scale(y).orient("left");

    var svg = d3.select('#gene_plot_container').append("svg")
        .attr("width", chart_width + gene_chart_margin.left + gene_chart_margin.right)
        .attr("height", gene_chart_height + gene_chart_margin.top + gene_chart_margin.bottom)
        .attr('id', 'inner_svg')
        .attr('class', 'hidden-xs')
        .append("g")
        .attr('id', 'inner_graph')
        .attr("transform", "translate(" + gene_chart_margin.left + "," + gene_chart_margin.top + ")");

    var area = d3.svg.area()
        .x( function(d) {
            return exon_x_scale(d[coords]);
        }).y0( function(d) {
            return gene_chart_height;
        }).y1( function(d) {
            return (metric in d) ? y(d[metric]) : gene_chart_height;
        });

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
 <!-- stuff i added -->
        .attr("data-toggle", "tooltip")
        .attr('filter_status', function(d) {
            return d.flag;
        })
        .attr('category', function(d) {
            return d.category;
        })
        .attr("class", function(d) {
            return "track_variant " + d.category;
        })
 <!-- stuff i added -->
        .attr("cx", function(d) {
            if (d['pos_coding_noutr'] == undefined) {
                return -100;
            } else {
                return exon_x_scale(d[coords]);
            }
        })
        .attr("cy", function(d){
               return (metric in d) ? y(d[metric]) : gene_chart_height;
        })
        .attr('r', 4 )
        .style("fill", variant_colors);

    d3.select('#gene_plot_container').append("br"); //make sure track_svg is below graph and not to the right of it

    // plot exons
    var svg_outer = d3.select('#gene_plot_container').append("svg")
        .attr("width", chart_width + gene_chart_margin_lower.left + gene_chart_margin_lower.right)
        .attr("height", lower_gene_chart_height)
        .attr('id', 'track_svg')
        .append("g")
        .attr('id', 'track')
        .attr("transform", "translate(" + gene_chart_margin_lower.left + "," + 0 + ")");
    var exon_color = "lightsteelblue";
    svg_outer.append("line")
        .attr("y1", lower_gene_chart_height/2)
        .attr("y2", lower_gene_chart_height/2)
        .attr("x1", 0)
        .attr("x2", exon_x_scale(coding_coordinate_params.size))
        .attr('id', 'boundary_line')
        .attr("stroke-width", 5)
        .attr("stroke", exon_color);

    console.log(_transcript);
    // plot exon rects
    svg_outer.selectAll("bar")
        .data(_transcript.exons)
        .enter()
        .append("rect")
        .attr('class', 'track_bar')
        .style("fill", exon_color)
        .attr("x", function(d, i) { return exon_x_scale(get_coding_coordinate(_transcript, d.start, true)); })
        .attr("y", function(d, i) {
            if (d.feature_type == 'CDS') {
                return 0;
            } else {
                return lower_gene_chart_height/4;
            }
        })


        .attr("width", function(d, i) {
            if (get_coding_coordinate(_transcript, d.start, true) == -100) {
                return exon_x_scale(175);
            }
            return exon_x_scale(d.stop-d.start+1);
        })
        .attr("height", function(d, i) {
            if (d.feature_type == 'CDS') {
                return lower_gene_chart_height;
            } else {
                return lower_gene_chart_height/2;
            }
        });


    var a_s = _transcript.strand == "-"? -1 : 1; //arrow direction
    var a_x = -5;  //arrow position on x-axis
    var a_y = lower_gene_chart_height/2.0; //arrow position on y-axis
    var a_w = 2; //arrow width
    var points = [[a_x+a_s*6, a_y], [a_x+a_s*1, a_y+a_w*3], [a_x+a_s*1, a_y+a_w], [a_x-a_s*9, a_y+a_w],
        [a_x-a_s*9, a_y-a_w], [a_x+a_s*1, a_y-a_w], [a_x+a_s*1, a_y-a_w*3]];
    svg_outer.append("polygon")
            .attr("points", points.join(" "))
            .attr("fill", "steelblue")
            .attr("stroke", "black");

    var bounds = get_af_bounds(variant_data);
    var min_af = bounds[0];
    var max_af = bounds[1];
    var min_af = .01;
    var max_af = 1;
    var variant_size_scale = d3.scale.log()
        .domain([min_af, max_af])
        //Circle/Ellipse
        .range([2, lower_gene_chart_height/3]);
        //Rectangle
//        .range([lower_gene_chart_height, 2]);

    // show variant category on hover
    var tip = d3.tip().attr('class', 'd3-tip').html(function(d) {
        if (d.category) {
            var csq = d.major_consequence.replace('_variant', '')
                    .replace('_', ' ')
                    .replace('utr', 'UTR')
                    .replace('3 prime', "3'")
                    .replace('5 prime', "5'")
                    .replace('nc ', "non-coding ");
            var output = csq + '<br/>' + d.chrom + ':' + d.pos + ' ' + d.ref + '&#8594;' + d.alt;
            if (d.major_consequence == 'missense_variant' || d.major_consequence == 'synonymous_variant') {
                output += '<br/>' + d.HGVSp;
            }
            //output += '<br/>P-value: ' + d.ibd_meta_p.toPrecision(3);
            //output += '<br/>Odds Ratio: ' + d.ibd_meta_or.toPrecision(3);
            return output;
        } else {
            return 'None';
        }
    });
    svg.call(tip);

    // plot variants
    svg_outer.selectAll("bar")
        .data(variant_data)
        .enter()
        .append("a")
        .attr('class', 'track_variant_link')
        .attr("xlink:href", function(d, i) { return "/variant/" + d.chrom + "-" + d.pos + "-" + d.ref + "-" + d.alt; })
        .attr("data-toggle", "tooltip")
        .attr('filter_status', function(d) {
            return d.filter;
        })
        .attr('category', function(d) {
            return d.category;
        })
        .attr('variant_id', function(d) {
            return d.variant_id;
        })
        .on('mouseover', function(d) {
            $('#variant_' + d.variant_id).find('td').addClass('table_hover');
            tip.show(d);
        })
        .on('mouseout', function(d) {
            $('#variant_' + d.variant_id).find('td').removeClass('table_hover');
            tip.hide(d);
        })
        //Circle
//        .append("circle")
        //Ellipse
        .append("ellipse")
        .attr("class", function(d) {
            return "track_variant " + d.category;
        })
        .style("opacity", 0.9)
        .attr("cx",  function(d) {
            if (d['pos_coding_noutr'] == undefined) {
                return -100;
            } else {
                return exon_x_scale(d[coords]);
            }
        })
        .attr("cy", lower_gene_chart_height/2)
        //Circle
//        .attr("r", function(d, i) { return variant_size_scale(d.ibd_meta_p); })
        //Ellipse
        .attr("rx", 2)
        .attr("ry", function(d, i) {
            if (d.ibd_meta_p == 0) {
                                return (2*(variant_size_scale(max_af) - variant_size_scale(.0000000000000000001)));
            } else {
               if (d.ibd_meta_p){
                return (2*(variant_size_scale(max_af) - variant_size_scale(d.ibd_meta_p)));
                }
              else { 
                 return 0;
                  }
            }
        })
        // Workaround for exporting d3 to SVG (other delcaration in style.css).
        .attr('stroke', variant_colors)
        .attr('fill', variant_colors);
        //Rectangle
//        .append("rect")
//        .attr("class", "track_variant")
//        .style("fill", "darkred")
//        .style("opacity", 0.5)
//        .attr("x", function(d, i) {
//            var tx_coord = d.transcript_coordinates[transcript];
//            if (tx_coord == 0) {
//                return -1000;
//            } else {
//                var variant_exon_number = d.vep_annotations[0]['EXON'].split('/')[0] - 1;
//                return exon_x_scale(tx_coord + variant_exon_number*padding);
//            }
//        })
//        .attr("y", function(d, i) { return lower_gene_chart_height/2 - variant_size_scale(d.ibd_meta_p)/2; } )
//        .attr("width", 2)
//        .attr("height", function(d, i) { return variant_size_scale(d.ibd_meta_p); })
//        .attr("rx", 6)
//        .attr("ry", 6);
}



function variant_colors(d) {
    if (d.category == 'lof_variant') {
        return '#cd2932';
    } else if (d.category == 'missense_variant') {
        return '#FF9966';
    } else if (d.category == 'synonymous_variant') {
        return '#228B22';
    }
    else{ 
         return "#d3d3d3";
    }
}


function change_coverage_chart(data, new_data, variant_data, _transcript, scale_type, metric, skip_utrs, container) {
    var coords = skip_utrs ? 'pos_coding_noutr' : 'pos_coding';
    var metricor = 'odds_ratio'; 
    var maxn = d3.max(data, function(d) { return d[metric] }) + 2;
    var maxnor = d3.max(data, function(d){ return d[metricor]}) + .3;
    var minor =  d3.min(data, function(d) { return d[metricor] }) - .3;
    var minor = minor < 0 ? 0 : minor; 
    var max_cov = (metric == '-log10pvalue') ? maxn : maxnor;
    var min_cov = (metric == '-log10pvalue') ? 0 : minor;
    var coding_coordinate_params = get_coding_coordinate_params(_transcript, skip_utrs);
    var chart_width;
    if (scale_type == 'overview') {
        chart_width = gene_chart_width;
    } else {
        chart_width = coding_coordinate_params.size*2;
    }
    var exon_x_scale = d3.scale.linear()
        .domain([0, coding_coordinate_params.size])
        .range([0, chart_width]);
    var svg = d3.select(container).select('#inner_svg')
        .attr("width", chart_width + gene_chart_margin.left + gene_chart_margin.right)
        .attr("height", gene_chart_height + gene_chart_margin.top + gene_chart_margin.bottom)
        .select('#inner_graph');

    var y = d3.scale.linear()
        .domain([min_cov, max_cov])
        .range([gene_chart_height, 0]);

    var area = d3.svg.area()
        .x( function(d) {
            return exon_x_scale(d[coords]);
        }).y0( function(d) {
            return gene_chart_height;
        }).y1( function(d) {
            return (metric in d) ? y(d[metric]) : gene_chart_height;
        });

    svg.selectAll("circle")
        .data(data)
        .transition()
        .duration(500)
        .attr("class", "dot")
<!-- stuff i added -->
        .attr("data-toggle", "tooltip")
        .attr('filter_status', function(d) {
            return d.flag;
        })
        .attr('category', function(d) {
            return d.category;
        })
        .attr("class", function(d) {
            return "track_variant " + d.category;
        })
 <!-- stuff i added -->
        .attr("cx", function(d) {
            if (d['pos_coding_noutr'] == undefined) {
                return -100;
            } else {
                return exon_x_scale(d[coords]);
            }
        })
        .attr("cy", function(d){
               return (metric in d) ? y(d[metric]) : gene_chart_height;
        })
        .attr('r', 4 )
        .style("fill", variant_colors);
;

    // plot exons
    var svg_outer = d3.select(container).select('#track_svg')
        .attr("width", chart_width + gene_chart_margin_lower.left + gene_chart_margin_lower.right)
        .attr("height", lower_gene_chart_height).select('#track');

    svg_outer.select('#boundary_line')
        .attr("x2", exon_x_scale(coding_coordinate_params.size));

    // plot exon rounded rects
    svg_outer.selectAll("rect")
        .data(_transcript.exons)
        .transition()
        .duration(500)
        .attr("x", function(d, i) { return exon_x_scale(get_coding_coordinate(_transcript, d.start, skip_utrs)); })
        .attr("width", function(d, i) {
            if (get_coding_coordinate(_transcript, d.start, skip_utrs) == -100) {
                return exon_x_scale(175);
            }
            return exon_x_scale(d.stop-d.start+1);
        })
        .attr("height", function(d, i) {
            if (d.feature_type == 'CDS') {
                return lower_gene_chart_height;
            } else {
                return lower_gene_chart_height/2;
            }
        });

    // plot variants
    svg_outer.selectAll("a")
        .data(variant_data)
        .transition()
        .duration(500)
        .selectAll('ellipse')
        .attr("cx", function(d) {
            if (d[coords] == undefined) {
                return -100;
            } else {
                return exon_x_scale(d[coords]);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    svg.select(".y.axis")
        .transition()
        .duration(200)
        .call(yAxis);
}

function create_new_data(data, coords) {
    var data_object = {};
    $.each(data, function(i, d) {
        data_object[d[coords]] = d;
    });
    var new_data = [];
    for (var i = d3.min(data, function(d) { return d[coords] }); i < d3.max(data, function(d) { return d[coords] }); i++) {
        var x = {'has_coverage': false};
        x[coords] = i;
        //Check the previous base to see if this is the beginning of an exon

        if (i in data_object && !(i-1 in data_object)) {
            new_data.push(x);
        }
        //Check the previous base to see if this is the end of an exon

        if (!(i in data_object) && i-1 in data_object) {
            x[coords] = i-1;
            new_data.push(x);
        }
        if (i in data_object) {
            new_data.push(data_object[i]);
        } else {
            new_data.push(x);
        }
    }
    return new_data;
}

function coverage_sum(key) {
    var total = 0;
    $.map(window.coverage_stats, function(entry) {
        total += entry[key];
    });
    return (total/window.coverage_stats.length).toPrecision(4);
}

function refresh_links() {
    $("#coverage_plot_download").attr('href', set_plot_image('gene_plot_container', 0));
    $("#exon_plot_download").attr('href', set_plot_image('gene_plot_container', 1));
}


$(document).ready(function() {
    if ($(window).width() < 768) {
        $('#gene_plot_container').css('width', $(window).width() + "px");
    } else {
        $('#gene_plot_container').css('width', $(window).width()*10/12 + "px");
    }
    precalc_coding_coordinates(window.transcript, window.coverage_stats, 'pos');
    precalc_coding_coordinates(window.transcript, window.variants_in_transcript, 'pos');

    // only show variants that have a coding coordinate
    window.variants_in_transcript = _.filter(window.variants_in_transcript, function(variant) {
        return variant.pos_coding != undefined;
    });

    // only show coding rects that have a coding coordinate
    window.coverage_stats = _.filter(window.coverage_stats, function(d) {
        return d.pos_coding != undefined;
    });
    $('#avg_coverage').html(coverage_sum('-log10pvalue'));
    $('#avg_coverage_x').html(coverage_sum('30')*100 + '%');

    var new_data = create_new_data(window.coverage_stats, 'pos_coding');
    var new_data_skip_utr = create_new_data(window.coverage_stats, 'pos_coding_noutr');
    if (window.coverage_stats != null) {
        gene_chart(window.coverage_stats, new_data_skip_utr, window.variants_in_transcript, window.transcript);
        if (window.variants_in_transcript.length) {
            update_variants();
        }
        $('#loading_coverage').hide();
    } else {
        $('#gene_plot').hide();
        $('#not_covered').show();
    }
    // Change coverage plot
    $('.coverage_metric_buttons').change(function () {
        var v = $(this).attr('id').replace('_covmet_button', '');
        $('.coverage_subcat_selectors').hide();
        if (v == 'covered') {
           $('#over_x_select_container').show();
            v = $('#over_x_select').val().replace('X', ''); 
        } else {
            $('#average_select_container').show();
            v = $("#average_select").val();
        }
        var detail = $('.display_coverage_metric_buttons.active').attr('id').replace('display_coverage_', '').replace('_button', '');
        var include_utrs = $('#include_utrs_checkbox').is(':checked');
        var plot_data = include_utrs ? new_data : new_data_skip_utr;
        change_coverage_chart(window.coverage_stats, plot_data, window.variants_in_transcript, window.transcript, detail, v, !include_utrs, '#gene_plot_container');
        refresh_links();
    });
    $('#over_x_select').change(function () {
        var detail = $('.display_coverage_metric_buttons.active').attr('id').replace('display_coverage_', '').replace('_button', '');
        var include_utrs = $('#include_utrs_checkbox').is(':checked');
        var plot_data = include_utrs ? new_data : new_data_skip_utr;
        $('#avg_coverage_type_x').html($(this).val());
        $('#avg_coverage_x').html(coverage_sum($(this).val().replace('X', ''))*100 + '%');
        change_coverage_chart(window.coverage_stats, plot_data, window.variants_in_transcript, window.transcript, detail, $(this).val().replace('X', ''), !include_utrs, '#gene_plot_container');
        refresh_links();
    });
    $('#average_select').change(function () {
        var detail = $('.display_coverage_metric_buttons.active').attr('id').replace('display_coverage_', '').replace('_button', '');
        var include_utrs = $('#include_utrs_checkbox').is(':checked');
        var plot_data = include_utrs ? new_data : new_data_skip_utr;
        $('#avg_coverage_type').html($(this).val());
        $('#avg_coverage').html(coverage_sum($(this).val()));
        change_coverage_chart(window.coverage_stats, plot_data, window.variants_in_transcript, window.transcript, detail, $(this).val(), !include_utrs, '#gene_plot_container');
        refresh_links();
    });
    $('#include_utrs_checkbox').change(function () {
        setTimeout(function() {
            var detail = $('.display_coverage_metric_buttons.active').attr('id').replace('display_coverage_', '').replace('_button', '');
            var v = $('.coverage_metric_buttons.active').attr('id').replace('_covmet_button', '');
            v = (v == 'covered') ? $('#over_x_select').val().replace('X', '') : $("#average_select").val(); 
            var include_utrs = $('#include_utrs_checkbox').is(':checked');
            var plot_data = include_utrs ? new_data : new_data_skip_utr;
            change_coverage_chart(window.coverage_stats, plot_data, window.variants_in_transcript, window.transcript, detail, v, !include_utrs, '#gene_plot_container');
            refresh_links();
        }, 10);
    });

// Change exon diagram
    $('#inverted_checkbox').change(function () {
        setTimeout(function () {
            var v = $('#inverted_checkbox').is(':checked');
            change_track_chart_variant_size(window.variants_in_transcript, v, '#gene_plot_container');
            refresh_links();
        }, 10);
    });

    $('.consequence_display_buttons, #filtered_checkbox').change(function () {
        setTimeout(function() {
            update_variants();
            refresh_links();
        }, 10);
    });

    $('.display_coverage_metric_buttons').change(function () {
        var detail = $(this).attr('id').replace('display_coverage_', '').replace('_button', '');
        var v = $('.coverage_metric_buttons.active').attr('id').replace('_covmet_button', '');
        if (v == 'covered') {
            $('#over_x_select_container').show();
            v = $('#over_x_select').val().replace('X', ''); 

        } else {
            $('#average_select_container').show();
            v = $("#average_select").val();
        }
        var include_utrs = $('#include_utrs_checkbox').is(':checked');
        var plot_data = include_utrs ? new_data : new_data_skip_utr;
        change_coverage_chart(window.coverage_stats, plot_data, window.variants_in_transcript, window.transcript, detail, v, !include_utrs, '#gene_plot_container');
        refresh_links();
    });
    refresh_links();
});
